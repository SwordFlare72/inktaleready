import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();

// Register auth routes (CRITICAL for password auth to work)
auth.addHttpRoutes(http);

// Add Google OAuth callback endpoint
http.route({
  path: "/auth/google/callback",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    try {
      const url = new URL(req.url);
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      const siteUrl = process.env.CONVEX_SITE_URL || "http://localhost:5173";

      if (error) {
        console.error("Google OAuth error:", error);
        return new Response(null, {
          status: 302,
          headers: {
            Location: `${siteUrl}/auth?error=${encodeURIComponent(error)}`,
          },
        });
      }

      if (!code) {
        console.error("No authorization code received");
        return new Response(null, {
          status: 302,
          headers: {
            Location: `${siteUrl}/auth?error=no_code`,
          },
        });
      }

      const redirectUri = `${process.env.CONVEX_SITE_URL}/auth/google/callback`;

      // Exchange code for tokens and create/update user
      console.log("Exchanging code for tokens...");
      const result = await ctx.runAction(internal.googleOAuth.exchangeCodeForTokens, {
        code,
        redirectUri,
      });

      console.log("User created/updated:", result.userId);

      // For Google OAuth, we need to create a proper Convex Auth session
      // by signing in the user through the Password provider with a temporary token
      // Since we can't directly create sessions, redirect with user info
      // and let the frontend handle the sign-in
      
      // Redirect back to app with success flag and user email
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${siteUrl}/auth?google_auth=success&email=${encodeURIComponent(result.userInfo.email)}`,
        },
      });
    } catch (error) {
      console.error("Google OAuth callback error:", error);
      const siteUrl = process.env.CONVEX_SITE_URL || "http://localhost:5173";
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${siteUrl}/auth?error=oauth_failed`,
        },
      });
    }
  }),
});

// Resend webhook endpoint
http.route({
  path: "/resend-webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const signature = req.headers.get("svix-signature");
      const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

      // Verify webhook signature (optional but recommended)
      if (webhookSecret && signature) {
        // Add signature verification logic here if needed
      }

      const body = await req.json();
      
      // Log webhook event
      console.log("Resend webhook event:", body);

      // Handle different event types
      const eventType = body.type;
      
      switch (eventType) {
        case "email.delivered":
          console.log(`Email delivered: ${body.data.email_id}`);
          break;
        case "email.bounced":
          console.log(`Email bounced: ${body.data.email_id}`);
          break;
        case "email.complained":
          console.log(`Spam complaint: ${body.data.email_id}`);
          break;
        case "email.opened":
          console.log(`Email opened: ${body.data.email_id}`);
          break;
        case "email.clicked":
          console.log(`Email link clicked: ${body.data.email_id}`);
          break;
        default:
          console.log(`Unknown event type: ${eventType}`);
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Webhook error:", error);
      return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

export default http;