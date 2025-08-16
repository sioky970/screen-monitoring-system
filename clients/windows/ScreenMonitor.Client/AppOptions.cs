namespace ScreenMonitor.Client;

public class AppOptions
{
    public string BackendBaseUrl { get; set; } = "http://206.119.177.133:3001/api";
    public string WebSocketUrl { get; set; } = "ws://206.119.177.133:3005/monitor";
    public int ScreenshotIntervalSeconds { get; set; } = 15;
    public int JpegQuality { get; set; } = 60;
    public int MaxLongSide { get; set; } = 1600;
    public int MaxRetry { get; set; } = 3;
    public int RetryBaseDelayMs { get; set; } = 1000;
    public int HeartbeatIntervalSeconds { get; set; } = 30;
    public int MaxImageBytes { get; set; } = 307200; // 300 KB
}

