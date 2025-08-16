using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace ScreenMonitor.Client;

public class Program
{
    public static void Main(string[] args)
    {
        var host = Host.CreateDefaultBuilder(args)
            .UseWindowsService()
            .ConfigureAppConfiguration((ctx, cfg) =>
            {
                cfg.AddJsonFile("appsettings.json", optional: true, reloadOnChange: true);
            })
            .ConfigureServices((ctx, services) =>
            {
                services.Configure<AppOptions>(ctx.Configuration.GetSection("App"));
                services.AddSingleton<IClientIdStore, FileClientIdStore>();
                services.AddHttpClient("api", client =>
                {
                    var baseUrl = ctx.Configuration["App:BackendBaseUrl"] ?? "http://localhost:3001/api";
                    client.BaseAddress = new Uri(baseUrl);
                    client.Timeout = TimeSpan.FromSeconds(30);
                });
                services.AddHostedService<ScreenWorker>();
            })
            .Build();

        host.Run();
    }
}

