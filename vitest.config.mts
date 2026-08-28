/**
 * ============================================================================
 *  Testes unitários do monorepo
 * ============================================================================
 *
 * UMA config para todos os pacotes, pelo mesmo motivo do `@portal/build-preset`:
 * quando a configuração de teste mora copiada em N pacotes, ela diverge, e a
 * squad que herda a cópia errada descobre no CI de outra pessoa.
 *
 * > **Vitest não reintroduz o Vite como bundler.** A ADR 0006 trocou Vite por
 * > Rspack por causa de Module Federation -- os remotes só federavam depois de
 * > `build` e o compartilhamento de singleton não valia em `dev`. Nada disso
 * > vale para um runner de teste, que não federa nem empacota para produção:
 * > ele transforma TSX e roda o módulo. O acoplamento com o bundler de produção
 * > continua onde a ADR 0006 diz que está (`loadRemote.ts` + o preset), e este
 * > arquivo não é um deles.
 *
 * O que estes testes cobrem é deliberado: não perseguimos cobertura de linha.
 * Cada arquivo de teste mira uma AFIRMAÇÃO que o projeto faz por escrito --
 * numa ADR, no README ou no MIGRATION.md -- e falha quando ela deixa de ser
 * verdade. Teste que só confirma que `render(<Button/>)` produz um `<button>`
 * não paga o próprio custo de manutenção.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    /**
     * `jsdom` para todos, inclusive os testes de função pura.
     *
     * Separar por glob economizaria alguns milissegundos e custaria uma regra a
     * mais para alguém entender errado -- um teste de componente escrito no
     * diretório "errado" passaria a rodar sem DOM e falhar com uma mensagem que
     * não aponta para a causa.
     */
    environment: 'jsdom',
    include: ['{apps,packages}/**/*.test.{ts,tsx,mts}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    // Sem globais: `describe`/`it`/`expect` são importados de 'vitest' em cada
    // arquivo. Custa uma linha e dispensa `types: ["vitest/globals"]` no
    // tsconfig -- ou seja, os testes são tipados pelo mesmo `npm run typecheck`
    // dos apps, sem configuração de tipo paralela.
    globals: false,
    restoreMocks: true
  }
});
