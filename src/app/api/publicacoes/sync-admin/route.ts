import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { NextResponse } from "next/server";

const BASE_URL = "https://cursos.alura.com.br/admin/courses";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ---------- helpers de parsing (validados em scripts/test-sync-admin.ts) ----------

function extractSelectedOption(html: string, selectClass: string): string {
  const reSelect = new RegExp(
    `<select[^>]*class="[^"]*${selectClass}[^"]*"[^>]*>([\\s\\S]*?)<\\/select>`,
    "i"
  );
  const selMatch = html.match(reSelect);
  if (!selMatch) return "";
  const reOption = /<option[^>]*\bselected\b[^>]*>/i;
  const optTag = selMatch[1].match(reOption);
  if (!optTag) return "";
  const valMatch = optTag[0].match(/value="([^"]*)"/i);
  return valMatch ? valMatch[1].trim() : "";
}

function extractCatalogs(html: string): string[] {
  const re = /<[^>]*class="[^"]*course-catalog-code[^"]*"[^>]*>([^<]+)<\//gi;
  const result: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    result.push(m[1].trim());
  }
  return result;
}

function parseDate(raw: string): Date | null {
  const m = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  return new Date(`${m[3]}-${m[2]}-${m[1]}`);
}

interface CourseRow {
  isExclusive: boolean;
  aluraId: number | null;
  slug: string;
  nome: string;
  instrutor: string;
  catalogos: string[];
  nivel: string;
  statusPub: string;
  dataCriacao: Date | null;
  dataAtualizacao: Date | null;
  statusCriacao: string;
  tipoContrato: string;
  tipo: string;
}

function parseTr(tr: string): CourseRow {
  const isExclusive = /class="exclusive-course"/i.test(tr);

  const tds: string[] = [];
  const reTd = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let m: RegExpExecArray | null;
  while ((m = reTd.exec(tr)) !== null) {
    tds.push(m[1]);
  }

  const cleanTd = (i: number) =>
    (tds[i] ?? "").replace(/<[^>]+>/g, "").trim();

  const tipoMatch = tr.match(/<span[^>]*class="[^"]*label[^"]*"[^>]*>([^<]+)<\/span>/i);
  const tipo = tipoMatch ? tipoMatch[1].trim() : "";

  const rawId = cleanTd(0);
  const aluraId = rawId ? parseInt(rawId, 10) || null : null;

  return {
    isExclusive,
    aluraId,
    slug: cleanTd(1),
    nome: cleanTd(2),
    instrutor: cleanTd(3),
    catalogos: extractCatalogs(tr),
    nivel: cleanTd(5),
    statusPub: cleanTd(6),
    dataCriacao: parseDate(cleanTd(7)),
    dataAtualizacao: parseDate(cleanTd(8)),
    statusCriacao: extractSelectedOption(tr, "change-creation_status"),
    tipoContrato: extractSelectedOption(tr, "change-contract_type"),
    tipo,
  };
}

function parsePage(html: string): CourseRow[] {
  const tableMatch = html.match(/<table[^>]*id="courses-table"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return [];

  const tableContent = tableMatch[1].replace(/<thead[\s\S]*?<\/thead>/i, "");

  const rows: CourseRow[] = [];
  const reTr = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m: RegExpExecArray | null;
  while ((m = reTr.exec(tableContent)) !== null) {
    rows.push(parseTr(m[0]));
  }
  return rows;
}

async function fetchPage(
  page: number,
  cookieHeader: string
): Promise<{ html: string; isLoginPage: boolean }> {
  const res = await fetch(`${BASE_URL}?page=${page}`, {
    headers: {
      "User-Agent": USER_AGENT,
      Cookie: cookieHeader,
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} na página ${page}`);
  const html = await res.text();
  const isLoginPage =
    /<title[^>]*>[^<]*[Ll]ogin[^<]*<\/title>/i.test(html) ||
    /<title[^>]*>[^<]*[Ee]ntrar[^<]*<\/title>/i.test(html) ||
    html.includes('action="/login"');
  return { html, isLoginPage };
}

async function getConfigValue(key: string): Promise<string> {
  const config = await prisma.systemConfig.findUnique({ where: { key } });
  if (config?.value) return decrypt(config.value);
  return process.env[key] ?? "";
}

// ---------- POST handler ----------

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  // Lê cookies do banco (criptografados) com fallback para .env
  const [sessionCookie, caelumToken, aluraUserId] = await Promise.all([
    getConfigValue("ALURA_SESSION_COOKIE"),
    getConfigValue("ALURA_CAELUM_TOKEN"),
    getConfigValue("ALURA_USER_ID"),
  ]);

  if (!sessionCookie && !caelumToken) {
    return NextResponse.json(
      { error: "Cookies de acesso não configurados. Acesse Admin → Configurações para configurá-los." },
      { status: 500 }
    );
  }

  const cookieParts: string[] = [];
  if (sessionCookie) cookieParts.push(`SESSION=${sessionCookie}`);
  if (caelumToken) cookieParts.push(`caelum.login.token=${caelumToken}`);
  if (aluraUserId) cookieParts.push(`alura.userId=${aluraUserId}`);
  const cookieHeader = cookieParts.join("; ");

  let created = 0;
  let updated = 0;
  let page = 1;

  try {
    while (true) {
      const { html, isLoginPage } = await fetchPage(page, cookieHeader);

      if (isLoginPage) {
        return NextResponse.json(
          { error: "Cookie expirado ou inválido. Acesse Admin → Configurações e atualize os cookies." },
          { status: 401 }
        );
      }

      const rows = parsePage(html);

      if (rows.length === 0) break;

      for (const row of rows) {
        if (!row.slug) continue;

        const existing = await prisma.aluraCourse.findUnique({
          where: { slug: row.slug },
          select: { id: true },
        });

        const data = {
          nome: row.nome || row.slug,
          aluraId: row.aluraId,
          instrutor: row.instrutor || null,
          nivel: row.nivel || null,
          statusPub: row.statusPub || null,
          statusCriacao: row.statusCriacao || null,
          tipoContrato: row.tipoContrato || null,
          tipo: row.tipo || null,
          catalogos: row.catalogos,
          isExclusive: row.isExclusive,
          dataCriacao: row.dataCriacao,
          dataAtualizacao: row.dataAtualizacao,
        };

        if (existing) {
          await prisma.aluraCourse.update({ where: { slug: row.slug }, data });
          updated++;
        } else {
          await prisma.aluraCourse.create({ data: { slug: row.slug, ...data } });
          created++;
        }
      }

      page++;
    }

    return NextResponse.json({ created, updated, total: created + updated });
  } catch (err) {
    console.error("[sync-admin] Erro:", err);
    return NextResponse.json({ error: "Erro interno ao sincronizar" }, { status: 500 });
  }
}
