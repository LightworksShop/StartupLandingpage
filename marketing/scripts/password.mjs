import { randomBytes, scryptSync } from "node:crypto";

// Read through stdin, never arguments or shell history. Output contains only a hash.
let value = "";
if (process.stdin.isTTY) {
  process.stderr.write("Neues Admin-Passwort (mindestens 14 Zeichen): ");
  process.stdin.setRawMode(true);
  process.stdin.resume();
  value = await new Promise(resolve => {
    const read = chunk => {
      const key = chunk.toString("utf8");
      if (key === "\u0003") { process.stdin.setRawMode(false); process.stderr.write("\n"); process.exit(130); }
      if (key.includes("\r") || key.includes("\n")) {
        process.stdin.setRawMode(false); process.stdin.off("data", read); process.stdin.pause();
        process.stderr.write("\n"); resolve(value); return;
      }
      if (key === "\u007f" || key === "\b") value = [...value].slice(0,-1).join("");
      else value += key;
    };
    process.stdin.on("data", read);
  });
} else {
  for await (const chunk of process.stdin) value += chunk;
}
const password = value.replace(/\r?\n$/, "");
if (password.length < 14 || password.length > 256) {
  process.stderr.write("Passwort muss 14 bis 256 Zeichen haben. Über stdin übergeben.\n");
  process.exit(1);
}
const salt = randomBytes(16).toString("hex");
process.stdout.write(`scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}\n`);
