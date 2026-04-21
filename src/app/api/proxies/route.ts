import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { mkdirSync, existsSync } from "fs";

const createProxySchema = z.object({
  name: z.string().min(1),
  host: z.string().min(1),
  port: z.number().int().positive(),
  username: z.string().default(""),
  password: z.string().default(""),
  protocol: z.enum(["http", "https", "socks5"]).default("http"),
  isActive: z.boolean().default(true),
});

const bulkImportSchema = z.object({
  proxies: z.string().min(1),
});

function parseProxyLine(line: string): z.infer<typeof createProxySchema> | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Format: protocol://user:pass@host:port or host:port:user:pass
  const urlMatch = trimmed.match(
    /^(https?|socks5):\/\/(?:([^:]+):([^@]+)@)?([^:]+):(\d+)$/
  );
  if (urlMatch) {
    return {
      name: `${urlMatch[4]}:${urlMatch[5]}`,
      protocol: urlMatch[1] as "http" | "https" | "socks5",
      username: urlMatch[2] || "",
      password: urlMatch[3] || "",
      host: urlMatch[4],
      port: parseInt(urlMatch[5]),
      isActive: true,
    };
  }

  // Format: host:port:user:pass
  const colonMatch = trimmed.match(/^([^:]+):(\d+):([^:]+):(.+)$/);
  if (colonMatch) {
    return {
      name: `${colonMatch[1]}:${colonMatch[2]}`,
      host: colonMatch[1],
      port: parseInt(colonMatch[2]),
      username: colonMatch[3],
      password: colonMatch[4],
      protocol: "http",
      isActive: true,
    };
  }

  // Format: host:port
  const simpleMatch = trimmed.match(/^([^:]+):(\d+)$/);
  if (simpleMatch) {
    return {
      name: `${simpleMatch[1]}:${simpleMatch[2]}`,
      host: simpleMatch[1],
      port: parseInt(simpleMatch[2]),
      username: "",
      password: "",
      protocol: "http",
      isActive: true,
    };
  }

  return null;
}

export async function GET() {
  const allProxies = await db.query.proxies.findMany({
    orderBy: (p, { desc }) => [desc(p.createdAt)],
  });
  return NextResponse.json(allProxies);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if it's a bulk import
    if (body.proxies && typeof body.proxies === "string") {
      const { proxies: raw } = bulkImportSchema.parse(body);
      const lines = raw.split("\n");
      const created = [];

      for (const line of lines) {
        const parsed = parseProxyLine(line);
        if (!parsed) continue;

        const id = uuid();
        const profilePath = `data/profiles/${id}`;

        // Ensure profile directory exists
        if (!existsSync(profilePath)) {
          mkdirSync(profilePath, { recursive: true });
        }

        await db.insert(schema.proxies).values({ id, ...parsed, profilePath });
        created.push({ id, ...parsed });
      }

      return NextResponse.json(
        { created: created.length, proxies: created },
        { status: 201 }
      );
    }

    // Single proxy creation
    const data = createProxySchema.parse(body);
    const id = uuid();
    const profilePath = `data/profiles/${id}`;

    if (!existsSync(profilePath)) {
      mkdirSync(profilePath, { recursive: true });
    }

    await db.insert(schema.proxies).values({ id, ...data, profilePath });

    const proxy = await db.query.proxies.findFirst({
      where: eq(schema.proxies.id, id),
    });

    return NextResponse.json(proxy, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Error creating proxy" },
      { status: 500 }
    );
  }
}
