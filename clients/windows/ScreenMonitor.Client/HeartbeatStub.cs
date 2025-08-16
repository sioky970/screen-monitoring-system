#if !SOCKETIO
namespace ScreenMonitor.Client;

// 预留：未启用 SOCKETIO 条件编译时使用空实现
public static class HeartbeatStub
{
    public static Task RunAsync(string clientId, AppOptions options, CancellationToken ct)
    {
        return Task.CompletedTask;
    }
}
#endif

