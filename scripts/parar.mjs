/**
 * Encerra o que sobrou de uma execucao anterior do portal.
 *
 * So mata processo que esteja escutando UMA das portas do projeto -- nunca um
 * `node` qualquer da maquina. Manda SIGTERM (o dev server fecha sozinho) e so
 * escala para SIGKILL no que resistir.
 */
import { execFileSync } from 'node:child_process';
import { setTimeout as esperar } from 'node:timers/promises';

const PORTAS = [4000, 5001, 5002, 5003, 5004, 5173];

const escutando = (porta) => {
  try {
    return execFileSync('lsof', ['-nP', `-iTCP:${porta}`, '-sTCP:LISTEN', '-t'], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']
    }).trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
};

const alvos = [...new Set(PORTAS.flatMap(escutando))];

if (alvos.length === 0) {
  console.log('  Nenhuma porta do portal esta ocupada. Nada a fazer.');
  process.exit(0);
}

for (const pid of alvos) {
  try { process.kill(Number(pid), 'SIGTERM'); } catch { /* ja saiu */ }
}
await esperar(2500);

const teimosos = [...new Set(PORTAS.flatMap(escutando))];
for (const pid of teimosos) {
  try { process.kill(Number(pid), 'SIGKILL'); } catch { /* ja saiu */ }
}
await esperar(500);

const restantes = PORTAS.filter((p) => escutando(p).length > 0);
if (restantes.length) {
  console.error(`  Ainda ocupadas: ${restantes.join(', ')}. Verifique com: lsof -nP -iTCP -sTCP:LISTEN`);
  process.exit(1);
}
console.log(`  ${alvos.length} processo(s) encerrado(s). Portas livres: ${PORTAS.join(', ')}.`);
