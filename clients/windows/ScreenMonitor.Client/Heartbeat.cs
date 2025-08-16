#if SOCKETIO
using SocketIOClient;
using SocketIOClient.Transport;
using System.Net.WebSockets;

namespace ScreenMonitor.Client;

public static class Heartbeat
{
    public static async Task RunAsync(string clientId, AppOptions options, CancellationToken ct)
    {
        var url = options.WebSocketUrl;
        var interval = TimeSpan.FromSeconds(Math.Max(10, options.HeartbeatIntervalSeconds));

        var backoff = new[] { 1, 2, 5, 10, 20 };

        while (!ct.IsCancellationRequested)
        {
            try
            {
                using var client = new SocketIO(url, new SocketIOOptions
                {
                    Transport = TransportProtocol.WebSocket,
                    Reconnection = true,
                    ReconnectionAttempts = int.MaxValue,
                    ReconnectionDelay = 2000,
                    EIO = 4
                });

                client.OnConnected += async (sender, e) =>
                {
                    try { await client.EmitAsync("join-client-room", new { clientId }); } catch { }
                };

                client.OnDisconnected += (sender, reason) => { };

                await client.ConnectAsync();

                while (client.Connected && !ct.IsCancellationRequested)
                {
                    try
                    {
                        await client.EmitAsync("client-heartbeat", new
                        {
                            clientId,
                            status = "online",
                            timestamp = DateTime.UtcNow
                        });
                    }
                    catch { /* ignore transient errors */ }

                    await Task.Delay(interval, ct);
                }
            }
            catch
            {
                // retry with backoff
            }

            for (int i = 0; i < backoff.Length && !ct.IsCancellationRequested; i++)
            {
                await Task.Delay(TimeSpan.FromSeconds(backoff[i]), ct);
                break; // simple backoff; next loop tries reconnect
            }
        }
    }
}
#endif

