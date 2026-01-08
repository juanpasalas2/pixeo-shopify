import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  // authenticate.webhook automatically validates the HMAC signature.
  // If the signature is invalid, it will throw a 401 error.
  const { topic, shop, payload } = await authenticate.webhook(request);

  console.log(`Received privacy webhook ${topic} for ${shop}`);
  
  switch (topic) {
    case "CUSTOMERS_DATA_REQUEST":
    case "customers/data_request":
      console.log(`Processing customer data request for ${shop}. Payload:`, JSON.stringify(payload, null, 2));
      // Local SQLite (Prisma) only stores merchant sessions (Session model), not end-customer data.
      // Therefore, there is no PII to retrieve from the local database.
      break;

    case "CUSTOMERS_REDACT":
    case "customers/redact":
      console.log(`Processing customer redact for ${shop}. Payload:`, JSON.stringify(payload, null, 2));
      // Local SQLite (Prisma) only stores merchant sessions (Session model), not end-customer data.
      // Therefore, there is no PII to redact from the local database.
      break;

    case "SHOP_REDACT":
    case "shop/redact":
      // The shop has been uninstalled for 48 hours and requested data deletion.
      // We must delete all sessions related to this shop from local SQLite.
      console.log(`Processing shop redact for ${shop} - Deleting sessions from SQLite`);
      try {
        const deleted = await prisma.session.deleteMany({
          where: { shop },
        });
        console.log(`Deleted ${deleted.count} sessions for ${shop} from local SQLite`);
      } catch (error) {
        console.error(`Error deleting sessions for ${shop} from local SQLite:`, error);
      }
      break;
      
    default: 
      console.log(`Unhandled privacy topic: ${topic}`);
  }

  return new Response("OK", { status: 200 });
};
