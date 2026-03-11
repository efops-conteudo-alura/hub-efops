/**
 * Script de TESTE para acesso ao admin da Alura.
 * NÃO escreve nada no banco — apenas valida cookie, fetch e parsing.
 *
 * Como usar:
 *   1. Preencha ALURA_SESSION_COOKIE no .env.local com o valor do cookie SESSION
 *      (DevTools → F12 → Application → Cookies → cursos.alura.com.br → SESSION)
 *   2. npx tsx scripts/test-sync-admin.ts
 *
 * Parâmetros opcionais (variáveis de ambiente):
 *   TEST_PAGES=3   → quantas páginas buscar (padrão: 2)
 */

import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

// Carrega .env.local manualmente (Next.js faz isso, tsx não)
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const SESSION_COOKIE = process.env.ALURA_SESSION_COOKIE ?? "";
const CAELUM_TOKEN = process.env.ALURA_CAELUM_TOKEN ?? "";
const ALURA_USER_ID = process.env.ALURA_USER_ID ?? "";
const MAX_PAGES = parseInt(process.env.TEST_PAGES ?? "2", 10);
const BASE_URL = "https://cursos.alura.com.br/admin/courses";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ---------- helpers de parsing ----------

function extractText(html: string, tag: string, nth = 1): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  let match: RegExpExecArray | null;
  let count = 0;
  while ((match = re.exec(html)) !== null) {
    count++;
    if (count === nth) {
      return match[1].replace(/<[^>]+>/g, "").trim();
    }
  }
  return "";
}

function extractAttr(html: string, attr: string): string {
  const re = new RegExp(`${attr}="([^"]*)"`, "i");
  const m = html.match(re);
  return m ? m[1].trim() : "";
}

function parseDate(raw: string): string | null {
  // Formato esperado: DD/MM/YYYY
  const m = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`; // ISO
}

function extractSelectedOption(html: string, selectClass: string): string {
  const reSelect = new RegExp(
    `<select[^>]*class="[^"]*${selectClass}[^"]*"[^>]*>([\\s\\S]*?)<\\/select>`,
    "i"
  );
  const selMatch = html.match(reSelect);
  if (!selMatch) return "";
  // <option value="CREATED" selected> ou <option selected value="CREATED">
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

// ---------- parsing de uma <tr> ----------

interface CourseRow {
  isExclusive: boolean;
  aluraId: string;
  slug: string;
  nome: string;
  instrutor: string;
  catalogos: string[];
  nivel: string;
  statusPub: string;
  dataCriacao: string | null;
  dataAtualizacao: string | null;
  statusCriacao: string;
  tipoContrato: string;
  tipo: string;
}

function parseTr(tr: string): CourseRow {
  const isExclusive = /class="exclusive-course"/i.test(tr);

  // Extrair todos os <td>
  const tds: string[] = [];
  const reTd = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let m: RegExpExecArray | null;
  while ((m = reTd.exec(tr)) !== null) {
    tds.push(m[1]);
  }

  const cleanTd = (i: number) =>
    (tds[i] ?? "").replace(/<[^>]+>/g, "").trim();

  // Span label para tipo (Curso, Formação, etc)
  const tipoMatch = tr.match(/<span[^>]*class="[^"]*label[^"]*"[^>]*>([^<]+)<\/span>/i);
  const tipo = tipoMatch ? tipoMatch[1].trim() : "";

  return {
    isExclusive,
    aluraId: cleanTd(0),
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

// ---------- fetch de uma página ----------

async function fetchPage(page: number, cookieHeader: string): Promise<{ html: string; status: number }> {
  const url = `${BASE_URL}?page=${page}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Cookie: cookieHeader,
    },
  });
  return { html: await res.text(), status: res.status };
}

// ---------- parsing de todas as <tr> de um HTML ----------

function parsePage(html: string): CourseRow[] {
  // A tabela não tem <tbody> — as <tr> ficam direto após o </thead> dentro de #courses-table
  const tableMatch = html.match(/<table[^>]*id="courses-table"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return [];

  // Remove o bloco <thead>...</thead> para pegar só as linhas de dados
  const tableContent = tableMatch[1].replace(/<thead[\s\S]*?<\/thead>/i, "");

  const rows: CourseRow[] = [];
  const reTr = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m: RegExpExecArray | null;
  while ((m = reTr.exec(tableContent)) !== null) {
    rows.push(parseTr(m[0]));
  }
  return rows;
}

// ---------- main ----------

async function main() {
  console.log("=== Teste de sync admin Alura ===\n");

  if (!SESSION_COOKIE && !CAELUM_TOKEN) {
    console.error(
      "ERRO: Defina pelo menos ALURA_SESSION_COOKIE ou ALURA_CAELUM_TOKEN no .env.local"
    );
    process.exit(1);
  }

  // Monta string de cookies com o que estiver disponível
  const cookieParts: string[] = [];
  if (SESSION_COOKIE) cookieParts.push(`SESSION=${SESSION_COOKIE}`);
  if (CAELUM_TOKEN) cookieParts.push(`caelum.login.token=${CAELUM_TOKEN}`);
  if (ALURA_USER_ID) cookieParts.push(`alura.userId=${ALURA_USER_ID}`);
  const cookieHeader = cookieParts.join("; ");

  console.log(`Cookies enviados: ${cookieParts.map(c => c.split("=")[0]).join(", ")}`);
  console.log(`SESSION: ${SESSION_COOKIE ? SESSION_COOKIE.slice(0, 10) + "..." : "não definido"}`);
  console.log(`Testando ${MAX_PAGES} página(s)...\n`);

  let totalCourses = 0;

  for (let page = 1; page <= MAX_PAGES; page++) {
    console.log(`--- Página ${page} ---`);
    const { html, status } = await fetchPage(page, cookieHeader);

    console.log(`  HTTP status: ${status}`);

    // Salva HTML da primeira página para diagnóstico
    if (page === 1) {
      const debugPath = `scripts/debug-page-${page}.html`;
      fs.writeFileSync(debugPath, html, "utf-8");
      console.log(`  HTML salvo em: ${debugPath} (${html.length} chars)`);
    }

    // Detecção de login: verifica se o título aponta para página de login
    const isLoginPage =
      /<title[^>]*>[^<]*[Ll]ogin[^<]*<\/title>/i.test(html) ||
      /<title[^>]*>[^<]*[Ee]ntrar[^<]*<\/title>/i.test(html) ||
      html.includes('action="/login"') ||
      html.includes('action="/entrar"');

    if (status === 302 || isLoginPage) {
      console.error(
        "  ERRO: Cookie expirado ou inválido — redirecionou para o login."
      );
      break;
    }

    const rows = parsePage(html);

    if (rows.length === 0) {
      console.log("  tbody vazio — fim das páginas.");
      break;
    }

    console.log(`  Cursos encontrados: ${rows.length}`);

    // Mostra os primeiros 3 para validação visual
    rows.slice(0, 3).forEach((r, i) => {
      console.log(`\n  [${i + 1}] ${r.nome}`);
      console.log(`       slug: ${r.slug}`);
      console.log(`       aluraId: ${r.aluraId}`);
      console.log(`       instrutor: ${r.instrutor}`);
      console.log(`       tipo: ${r.tipo}`);
      console.log(`       nivel: ${r.nivel}`);
      console.log(`       statusPub: ${r.statusPub}`);
      console.log(`       statusCriacao: ${r.statusCriacao}`);
      console.log(`       tipoContrato: ${r.tipoContrato}`);
      console.log(`       catalogos: [${r.catalogos.join(", ")}]`);
      console.log(`       dataCriacao: ${r.dataCriacao}`);
      console.log(`       dataAtualizacao: ${r.dataAtualizacao}`);
      console.log(`       isExclusive: ${r.isExclusive}`);
    });

    if (rows.length > 3) {
      console.log(`  ... e mais ${rows.length - 3} curso(s)`);
    }

    totalCourses += rows.length;
    console.log();
  }

  console.log(`\n=== Resultado: ${totalCourses} cursos lidos em ${MAX_PAGES} página(s) ===`);
  console.log("Nenhum dado foi gravado no banco.");
  console.log(
    "Se os dados acima parecem corretos, avise para implementar no hub."
  );
}

main().catch((err) => {
  console.error("Erro inesperado:", err);
  process.exit(1);
});
