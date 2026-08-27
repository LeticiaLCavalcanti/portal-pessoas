/**
 * FRONTEIRA ASSINCRONA do Module Federation.
 *
 * O ponto de entrada nao pode importar React diretamente. React e um `shared`
 * singleton: o runtime de federacao precisa negociar QUAL copia da biblioteca
 * vale para a pagina (a do shell ou a de uma jornada com versao mais alta)
 * antes que qualquer modulo compartilhado seja avaliado.
 *
 * Um `import()` dinamico cria essa fronteira: tudo depois dele ja roda com os
 * singletons resolvidos. Sem isto, o shell fixaria a propria copia de React
 * antes da negociacao e voltariamos a ter duas copias na pagina -- que e o
 * jeito classico de quebrar hooks em producao.
 *
 * A alternativa (`eager: true` nos shared) evita este arquivo, mas obriga o
 * shell a carregar React de forma sincrona no bundle inicial e impede que uma
 * jornada forneca a copia -- pior custo de carregamento, mesmo resultado.
 */
import('./bootstrap');
