/**
 * Pre-voo do `npm run dev`.
 *
 * Por que existe: quando uma das seis portas já está ocupada, cada processo
 * morre com o seu próprio stack trace de `EADDRINUSE` e o terminal vira um
 * muro de ruído em que a causa real -- "sobrou um servidor da execução
 * anterior" -- fica enterrada. Isso é especialmente fácil de acontecer aqui
 * porque o `concurrently` roda SEM `--kill-others` de propósito (a queda de
 * uma jornada não pode derrubar o portal), então um start que falha no meio
 * deixa sobreviventes.
 *
 * Este script troca seis stack traces por uma frase e um comando.
 */
import { execFileSync } from 'node:child_process';

const PORTS = [
  [4000, 'BFF'],
  [5001, 'jornada ponto'],
  [5002, 'jornada beneficios'],
  [5003, 'plataforma legada'],
  [5004, 'jornada holerite'],
  [5173, 'shell']
];

/** `lsof` sai com código 1 quando não há nada escutando -- isso é sucesso aqui. */
const listeningOn = (port) => {
  try {
    const out = execFileSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    });
    return out.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
};

const commandOf = (pid) => {
  try {
    return execFileSync('ps', ['-o', 'command=', '-p', pid], { encoding: 'utf8' }).trim();
  } catch {
    return '(processo desconhecido)';
  }
};

const busy = PORTS.map(([port, name]) => [port, name, listeningOn(port)])
  .filter(([, , pids]) => pids.length > 0);

if (busy.length === 0) process.exit(0);

console.error('\n  Não dá para subir o portal: porta em uso.\n');
for (const [port, name, pids] of busy) {
  console.error(`  ${port}  ${name}`);
  for (const pid of pids) console.error(`        pid ${pid}  ${commandOf(pid).slice(0, 90)}`);
}
console.error(`
  Quase sempre é sobra da execução anterior. Para encerrar:

      npm run stop

  Se a porta for de outro programa seu, ajuste a porta da jornada em
  apps/<app>/rspack.config.mjs e o 'entry' correspondente em
  apps/bff/src/registry.json.
`);
process.exit(1);
