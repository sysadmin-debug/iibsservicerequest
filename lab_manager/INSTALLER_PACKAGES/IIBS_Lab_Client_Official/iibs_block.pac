function FindProxyForURL(url, host) {
    var blocked = [
        "youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "googlevideo.com", "ytimg.com",
        "facebook.com", "www.facebook.com", "m.facebook.com", "fbcdn.net", "fb.com", "messenger.com",
        "instagram.com", "www.instagram.com", "cdninstagram.com"
    ];
    for (var i = 0; i < blocked.length; i++) {
        if (dnsDomainIs(host, blocked[i]) || host == blocked[i]) {
            return "PROXY 127.0.0.1:9";
        }
    }
    return "DIRECT";
}