using System.Buffers;
using System.Drawing;
using System.Drawing.Imaging;
using System.Net.Http.Headers;
using System.Runtime.InteropServices;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ScreenMonitor.Client;

public class ScreenWorker : BackgroundService
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly IClientIdStore _store;
    private readonly ILogger<ScreenWorker> _logger;
    private readonly AppOptions _options;

    public ScreenWorker(IHttpClientFactory httpFactory, IClientIdStore store, IOptions<AppOptions> options, ILogger<ScreenWorker> logger)
    {
        _httpFactory = httpFactory;
        _store = store;
        _logger = logger;
        _options = options.Value;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("ScreenWorker starting");

        // 1) 获取/持久化 clientId
        var clientId = await _store.LoadAsync(stoppingToken);
        if (string.IsNullOrWhiteSpace(clientId))
        {
            clientId = await RegisterAsync(stoppingToken);
            if (!string.IsNullOrWhiteSpace(clientId))
            {
                await _store.SaveAsync(clientId!, stoppingToken);
            }
        }

        if (string.IsNullOrWhiteSpace(clientId))
        {
            _logger.LogError("Failed to obtain clientId; service will retry later");
            return;
        }

#if SOCKETIO
        // 2) 启动 WebSocket 心跳
        _ = Heartbeat.RunAsync(clientId!, _options, stoppingToken);
#else
        // 2) 启动心跳占位（未启用 SOCKETIO 条件编译）
        _ = HeartbeatStub.RunAsync(clientId!, _options, stoppingToken);
#endif

        // 3) 定时截图上传
        var timer = new PeriodicTimer(TimeSpan.FromSeconds(_options.ScreenshotIntervalSeconds));
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await CaptureAndUploadAsync(clientId!, stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Upload cycle failed");
            }
        }
    }

    private async Task<string?> RegisterAsync(CancellationToken ct)
    {
        try
        {
            using var client = _httpFactory.CreateClient("api");
            var body = new
            {
                clientNumber = $"WIN-{Environment.MachineName}-{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}",
                clientName = "Windows 客户端",
                computerName = Environment.MachineName,
                os = RuntimeInformation.OSDescription,
                version = "1.0.0",
                remark = $"User={Environment.UserName}"
            };
            var resp = await client.PostAsJsonAsync("/clients", body, ct);
            resp.EnsureSuccessStatusCode();
            using var doc = await System.Text.Json.JsonDocument.ParseAsync(await resp.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
            var root = doc.RootElement;
            string? id = null;
            if (root.TryGetProperty("data", out var data))
            {
                if (data.TryGetProperty("id", out var idProp)) id = idProp.GetString();
                else if (data.TryGetProperty("data", out var data2) && data2.TryGetProperty("id", out var idProp2)) id = idProp2.GetString();
            }
            _logger.LogInformation("Registered clientId: {ClientId}", id);
            return id;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Register failed");
            return null;
        }
    }

    private async Task CaptureAndUploadAsync(string clientId, CancellationToken ct)
    {
        // 捕获主屏截图并保存 JPG 到内存
        using var bmp = CapturePrimaryScreen();
        using var ms = new MemoryStream();
        // 将图片压缩至不超过 MaxImageBytes（尽力而为）
        SaveJpegWithTarget(bmp, ms, _options.JpegQuality, _options.MaxImageBytes);
        ms.Position = 0;

        using var client = _httpFactory.CreateClient("api");
        using var form = new MultipartFormDataContent();
        form.Add(new StringContent(clientId), "clientId");
        form.Add(new StringContent(string.Empty), "clipboardContent");
        var fileContent = new StreamContent(ms);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        var fileName = $"screenshot_{DateTime.UtcNow:yyyyMMdd_HHmmssfff}.jpg";
        form.Add(fileContent, "file", fileName);

        var resp = await client.PostAsync("/security/screenshots/upload", form, ct);
        resp.EnsureSuccessStatusCode();
        _logger.LogInformation("Uploaded screenshot: {File} ({Bytes} bytes)", fileName, ms.Length);
    }

    private static Bitmap CapturePrimaryScreen()
    {
        var bounds = System.Windows.Forms.Screen.PrimaryScreen!.Bounds;
        var bmp = new Bitmap(bounds.Width, bounds.Height, PixelFormat.Format24bppRgb);
        using var g = Graphics.FromImage(bmp);
        g.CopyFromScreen(bounds.Location, System.Drawing.Point.Empty, bounds.Size);
        return bmp;
    }

    private void SaveJpegWithTarget(Image img, Stream output, int quality, int targetBytes)
    {
        int q = Math.Clamp(quality, 20, 90);
        for (int attempt = 0; attempt < 4; attempt++)
        {
            output.SetLength(0);
            SaveJpegOnce(img, output, q);
            if (targetBytes <= 0 || output.Length <= targetBytes) return;
            // 若超过目标体积，降低质量并重试
            q = Math.Max(20, q - 10);
        }
    }

    private void SaveJpegOnce(Image img, Stream output, int quality)
    {
        var codec = ImageCodecInfo.GetImageEncoders().First(e => e.MimeType == "image/jpeg");
        using var ep = new EncoderParameters(1);
        ep.Param[0] = new EncoderParameter(System.Drawing.Imaging.Encoder.Quality, Math.Clamp(quality, 10, 95));

        // 可选缩放：最长边 MaxLongSide
        if (_options.MaxLongSide > 0)
        {
            var (w, h) = (img.Width, img.Height);
            var maxSide = Math.Max(w, h);
            if (maxSide > _options.MaxLongSide)
            {
                var scale = (double)_options.MaxLongSide / maxSide;
                var nw = (int)Math.Round(w * scale);
                var nh = (int)Math.Round(h * scale);
                using var resized = new Bitmap(nw, nh);
                using (var g = Graphics.FromImage(resized))
                {
                    g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBilinear;
                    g.DrawImage(img, 0, 0, nw, nh);
                }
                resized.Save(output, codec, ep);
                return;
            }
        }

        img.Save(output, codec, ep);
    }
}

