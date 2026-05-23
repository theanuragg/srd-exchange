import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const pkgDir = join(root, "node_modules/@ant-design/v5-patch-for-react-19");

if (!existsSync(pkgDir)) {
  const esDir = join(pkgDir, "es");
  const libDir = join(pkgDir, "lib");
  mkdirSync(esDir, { recursive: true });
  mkdirSync(libDir, { recursive: true });

  writeFileSync(
    join(pkgDir, "package.json"),
    JSON.stringify({ name: "@ant-design/v5-patch-for-react-19", version: "1.0.3", main: "lib/index.js", module: "es/index.js" })
  );

  const stubContent = "'use client';\n// Noop stub for antd v4 + React 19 compatibility\n";
  writeFileSync(join(esDir, "index.js"), stubContent);
  writeFileSync(join(libDir, "index.js"), stubContent);

  console.log("✅ Patched @ant-design/v5-patch-for-react-19 (antd v4 stub)");
}
