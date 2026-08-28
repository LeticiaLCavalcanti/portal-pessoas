/**
 * Encerra o que sobrou de uma execução anterior do portal.
 *
 * Só mata processo que esteja escutando UMA das portas do projeto -- nunca um
 * `node` qualquer da maquina. Manda SIGTERM (o dev server fecha sozinho) e só
 * escala para SIGKILL no que resistir.
 */
import { execFileSync } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';

const PORTS = [4000, 5001, 5002, 5003, 5004, 5173];

const listeningOn = (port) => {
  try {
    return execFileSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']
    }).trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
};

const targets = [...new Set(PORTS.flatMap(listeningOn))];

if (targets.length === 0) {
  console.log('  Nenhuma porta do portal está ocupada. Nada a fazer.');
  process.exit(0);
}

for (const pid of targets) {
  try { process.kill(Number(pid), 'SIGTERM'); } catch { /* já saiu */ }
}
await wait(2500);

const stubborn = [...new Set(PORTS.flatMap(listeningOn))];
for (const pid of stubborn) {
  try { process.kill(Number(pid), 'SIGKILL'); } catch { /* já saiu */ }
}
await wait(500);

const remaining = PORTS.filter((p) => listeningOn(p).length > 0);
if (remaining.length) {
  console.error(`  Ainda ocupadas: ${remaining.join(', ')}. Verifique com: lsof -nP -iTCP -sTCP:LISTEN`);
  process.exit(1);
}
console.log(`  ${targets.length} processo(s) encerrado(s). Portas livres: ${PORTS.join(', ')}.`);
