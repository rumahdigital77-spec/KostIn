package com.kostin.app;

import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.graphics.Typeface;
import android.view.Gravity;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.LinearLayout;
import android.widget.TextView;

public class MainActivity extends Activity {
    private static final String HOME_URL = "https://kost-in-three.vercel.app/";
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        try {
            buildWebView();
        } catch (Throwable t) {
            showError(t);
        }
    }

    private void buildWebView() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(6, 43, 87));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(6, 43, 87));

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setSupportMultipleWindows(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setLoadWithOverviewMode(false);
        s.setUseWideViewPort(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);

        CookieManager cm = CookieManager.getInstance();
        cm.setAcceptCookie(true);
        cm.setAcceptThirdPartyCookies(webView, true);

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String u = request.getUrl().toString();
                if (u.startsWith("http://") || u.startsWith("https://")) {
                    view.loadUrl(u);
                    return true;
                }
                return false;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    showWebError(error != null ? String.valueOf(error.getDescription()) : "Koneksi gagal");
                }
            }
        });

        root.addView(webView, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));
        setContentView(root);
        webView.loadUrl(HOME_URL);
    }

    private void showWebError(String message) {
        if (webView == null) return;
        String html = "<html><body style='margin:0;background:#062B57;color:#F7D778;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center'>" +
                "<div><h2>KOSTIN</h2><p>Koneksi ke KostIn gagal.</p><p style='font-size:13px'>" + message + "</p>" +
                "<button onclick='location.reload()' style='padding:12px 20px;border:0;border-radius:10px'>Coba Lagi</button></div></body></html>";
        webView.loadDataWithBaseURL(HOME_URL, html, "text/html", "UTF-8", HOME_URL);
    }

    private void showError(Throwable t) {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER);
        box.setPadding(32, 32, 32, 32);
        box.setBackgroundColor(Color.rgb(6, 43, 87));

        TextView title = new TextView(this);
        title.setText("KOSTIN");
        title.setTextColor(Color.rgb(247, 215, 120));
        title.setTextSize(30);
        title.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        title.setGravity(Gravity.CENTER);

        TextView msg = new TextView(this);
        msg.setText("Aplikasi gagal dibuka. Silakan buka kembali aplikasi.");
        msg.setTextColor(Color.WHITE);
        msg.setTextSize(16);
        msg.setGravity(Gravity.CENTER);
        msg.setPadding(0, 24, 0, 0);

        box.addView(title);
        box.addView(msg);
        setContentView(box);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}