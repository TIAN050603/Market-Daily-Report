import { migrate } from "@/lib/db/connection";

migrate();
console.log("Database migrated.");
