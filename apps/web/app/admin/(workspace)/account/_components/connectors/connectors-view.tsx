"use client";

import { ConnectorCard } from "./connector-card";
import { ConnectorSearch } from "./connector-search";
import { ConnectorsTabs } from "./connectors-tabs";
import { getConnectorStatus, useConnectorsView } from "../../_hooks/use-connectors-view";

export function ConnectorsView() {
  const {
    activeTab,
    notionConnected,
    googleCalendarConnected,
    search,
    searchInputRef,
    searchOpen,
    setActiveTab,
    setSearch,
    setSearchOpen,
    visibleConnectors
  } = useConnectorsView();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 overflow-y-auto scrollbar-none px-4 py-6 sm:px-6 lg:px-10">
      <section className="grid gap-4">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-semibold text-foreground sm:text-4xl md:text-5xl">Conectores</h1>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Conecta apps para importar informacion, sincronizar tareas y preparar automatizaciones
            del estudio.
          </p>
        </div>
      </section>

      <section className="grid gap-7">
        <ConnectorsTabs activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="grid gap-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Descubrir conectores</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Explora las integraciones disponibles para tu workspace.
              </p>
            </div>
            <ConnectorSearch
              inputRef={searchInputRef}
              open={searchOpen || Boolean(search)}
              search={search}
              onOpenChange={setSearchOpen}
              onSearchChange={setSearch}
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visibleConnectors.map((connector) => (
              <ConnectorCard
                key={connector.id}
                connector={connector}
                status={getConnectorStatus(connector, notionConnected, googleCalendarConnected)}
              />
            ))}
          </div>

          {visibleConnectors.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-card px-5 py-12 text-center text-sm text-muted-foreground">
              No encontramos conectores para esta busqueda.
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
