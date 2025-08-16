using System.Text.Json;

namespace ScreenMonitor.Client;

public class FileClientIdStore : IClientIdStore
{
    private readonly string _dir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "ScreenMonitor");
    private readonly string _file;

    public FileClientIdStore()
    {
        Directory.CreateDirectory(_dir);
        _file = Path.Combine(_dir, "client.json");
    }

    public async Task<string?> LoadAsync(CancellationToken ct = default)
    {
        if (!File.Exists(_file)) return null;
        await using var fs = File.OpenRead(_file);
        var doc = await JsonDocument.ParseAsync(fs, cancellationToken: ct);
        if (doc.RootElement.TryGetProperty("clientId", out var idProp))
        {
            return idProp.GetString();
        }
        return null;
    }

    public async Task SaveAsync(string clientId, CancellationToken ct = default)
    {
        var json = JsonSerializer.Serialize(new { clientId });
        await File.WriteAllTextAsync(_file, json, ct);
    }
}

