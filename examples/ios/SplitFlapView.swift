import SwiftUI
import WebKit

/// SwiftUI wrapper. Bundle `split-flap.global.js` in your app target (Copy Bundle Resources).
/// A plain <script> tag is used because WKWebView blocks ES modules loaded from file://.
struct SplitFlapView: UIViewRepresentable {
    var lines: [String]
    var theme = "black"
    var size = 28
    var sound = false

    func makeUIView(context: Context) -> WKWebView {
        let cfg = WKWebViewConfiguration()
        cfg.mediaTypesRequiringUserActionForPlayback = []   // let the click sound play after a tap
        let web = WKWebView(frame: .zero, configuration: cfg)
        web.isOpaque = false
        web.backgroundColor = .clear
        web.scrollView.isScrollEnabled = false

        let js = try! String(contentsOf: Bundle.main.url(forResource: "split-flap.global", withExtension: "js")!)
        let html = """
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <style>html,body{margin:0;background:transparent;display:grid;place-items:center;height:100vh}</style>
        <div id="m"></div><script>\(js)</script>
        <script>window.board = SplitFlapLib.createSplitFlap(document.getElementById("m"),
          {lines: \(json(lines)), size: \(size), theme: "\(theme)", sound: \(sound)});</script>
        """
        web.loadHTMLString(html, baseURL: nil)
        return web
    }

    func updateUIView(_ web: WKWebView, context: Context) {
        web.evaluateJavaScript("window.board && (window.board.lines = \(json(lines)));")
    }

    private func json(_ a: [String]) -> String {
        String(data: try! JSONSerialization.data(withJSONObject: a), encoding: .utf8)!
    }
}

// Usage:  SplitFlapView(lines: ["GATE B22", "BOARDING"], theme: "white")
//         .frame(height: 140)
