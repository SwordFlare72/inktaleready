import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();

// Register auth routes (CRITICAL for password auth to work)
auth.addHttpRoutes(http);

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
          // You could store this in a table or send a notification
          break;
        case "email.complained":
          console.log(`Spam complaint: ${body.data.email_id}`);
          // Handle spam complaints
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