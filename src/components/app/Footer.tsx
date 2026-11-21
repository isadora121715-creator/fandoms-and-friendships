const link = "underline decoration-border underline-offset-2 hover:text-foreground";

/** Image credits for the cover art, shown on every page. */
export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-6 text-xs leading-relaxed text-muted-foreground">
        <p>
          Capas, pôsteres e sinopses:{" "}
          <a href="https://pt.wikipedia.org" target="_blank" rel="noreferrer" className={link}>
            Wikipédia
          </a>
          ,{" "}
          <a href="https://commons.wikimedia.org" target="_blank" rel="noreferrer" className={link}>
            Wikimedia Commons
          </a>
          ,{" "}
          <a href="https://www.wikidata.org" target="_blank" rel="noreferrer" className={link}>
            Wikidata
          </a>{" "}
          e{" "}
          <a href="https://www.tvmaze.com" target="_blank" rel="noreferrer" className={link}>
            TVMaze
          </a>
          . As imagens pertencem aos seus respectivos estúdios, distribuidoras e detentores de
          direitos e são exibidas apenas para identificar cada título.
        </p>
        <p className="mt-1">
          Textos da Wikipédia sob licença{" "}
          <a
            href="https://creativecommons.org/licenses/by-sa/4.0/deed.pt-br"
            target="_blank"
            rel="noreferrer"
            className={link}
          >
            CC BY-SA 4.0
          </a>
          . © {new Date().getFullYear()} Lorebox.
        </p>
      </div>
    </footer>
  );
}
