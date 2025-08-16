namespace ScreenMonitor.Client;

public interface IClientIdStore
{
    Task<string?> LoadAsync(CancellationToken ct = default);
    Task SaveAsync(string clientId, CancellationToken ct = default);
}

