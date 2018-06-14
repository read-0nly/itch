import {
  ILocalizedString,
  IStore,
  IRootState,
  ITabPage,
  ITabData,
  ITabLog,
  ITabCollections,
  ITabInstance,
  ITabWeb,
  ITabLocation,
  ITabGames,
} from "../types/index";

import nodeURL, { format, URLSearchParams } from "url";
import querystring from "querystring";

import { Game, Collection, User } from "common/butlerd/messages";
import { currentPage } from "../util/navigation";

// Empty Object
const eo = {} as any;

const spaceFromInstance = (dataIn: ITabInstance) => new Space(dataIn);

/**
 * A Space gives structured info about a tab.
 *
 * Because spaces > tabs.
 */
export class Space {
  prefix: string;
  suffix: string;
  private _instance: ITabInstance;
  private _page: ITabPage;
  private _data: ITabData;
  private _protocol: string;
  private _hostname: string;
  private _pathname: string;
  private _pathElements: string[];
  private _query: querystring.ParsedUrlQuery;
  private _querylessURL: string;

  constructor(instanceIn: ITabInstance) {
    let instance = instanceIn || eo;

    this._instance = instance;
    this._data = instance.data || eo;
    this._page = currentPage(instance) || eo;

    const { resource, url } = this._page;
    if (resource) {
      const slashIndex = resource.indexOf("/");
      if (slashIndex > 0) {
        this.prefix = resource.substring(0, slashIndex);
        this.suffix = resource.substring(slashIndex + 1);
      } else {
        this.prefix = resource;
      }
    }

    if (url) {
      try {
        const parsed = nodeURL.parse(url);
        this._protocol = parsed.protocol;
        this._hostname = parsed.hostname;
        this._pathname = parsed.pathname;
        this._query = querystring.parse(parsed.query);
        if (parsed.pathname) {
          this._pathElements = parsed.pathname.replace(/^\//, "").split("/");
        }

        {
          const { query, search, href, ...rest } = parsed;
          this._querylessURL = nodeURL.format(rest);
        }
      } catch (e) {
        // TODO: figure this out
        console.log(`Could not parse url: `, e);
      }
    }
  }

  static fromStore(store: IStore, window: string, tab: string): Space {
    return this.fromState(store.getState(), window, tab);
  }

  static fromState(rs: IRootState, window: string, tab: string): Space {
    return spaceFromInstance(rs.windows[window].tabInstances[tab]);
  }

  static fromInstance(data: ITabInstance): Space {
    return spaceFromInstance(data);
  }

  url(): string {
    return this._page.url;
  }

  urlWithParams(newParams: Object): string {
    const params = new URLSearchParams(this._query);
    for (const k of Object.keys(newParams)) {
      const v = newParams[k];
      params.set(k, v);
    }
    return format({
      protocol: this._protocol,
      hostname: this._hostname,
      pathname: this._pathname,
      slashes: true,
      search: `?${params.toString()}`,
    });
  }

  queryParam(name: string): string {
    if (this._query) {
      const value = this._query[name];
      if (Array.isArray(value)) {
        return value[0];
      } else {
        return value;
      }
    }
    return null;
  }

  resource(): string {
    return this._page.resource;
  }

  numericId(): number {
    return parseInt(this.suffix, 10);
  }

  stringId(): string {
    return this.suffix;
  }

  game(): Game {
    const gameSet = this.games().set || eo;
    return gameSet[this.numericId()] || eo;
  }

  games(): ITabGames {
    return this._data.games || eo;
  }

  collections(): ITabCollections {
    return this._data.collections || eo;
  }

  collection(): Collection {
    return (
      ((this._data.collections || eo).set || eo)[this.firstPathNumber()] || eo
    );
  }

  user(): User {
    return ((this._data.users || eo).set || eo)[this.numericId()] || eo;
  }

  web(): ITabWeb {
    return this._data.web || eo;
  }

  log(): ITabLog {
    return this._data.log || eo;
  }

  location(): ITabLocation {
    return this._data.location || eo;
  }

  icon(): string {
    switch (this.internalPage()) {
      case "featured":
        return "itchio";
      case "dashboard":
        return "archive";
      case "library":
        return "heart-filled";
      case "preferences":
        return "cog";
      case "downloads":
        return "download";
      case "collections":
        return "video_collection";
      case "games":
        return "star";
      case "locations":
        return "folder-open";
      case "new-tab":
        return "star2";
      case "applog":
        return "bug";
    }

    return fallbackIcon;
  }

  image(): string {
    const g = this.game();
    let gameCover = g.stillCoverUrl || g.coverUrl;
    if (gameCover) {
      return gameCover;
    }

    if (this.internalPage()) {
      // only icons
      return null;
    }
    return this.web().favicon;
  }

  isBrowser(): boolean {
    switch (this._protocol) {
      case "itch:": {
        switch (this._hostname) {
          case "featured":
            return true;
          case "new-tab":
            return true;
          default:
            return false;
        }
      }
    }

    return !!this._page.url;
  }

  protocol(): string {
    return this._protocol;
  }

  internalPage(): string {
    if (this._protocol === "itch:") {
      return this._hostname;
    }
    return null;
  }

  firstPathElement(): string {
    if (this._pathElements) {
      return this._pathElements[0];
    }
    return null;
  }

  firstPathNumber(): number {
    if (this._pathElements) {
      return parseInt(this._pathElements[0], 10);
    }
    return null;
  }

  query(): querystring.ParsedUrlQuery {
    return this._query || eo;
  }

  label(): ILocalizedString {
    if (this._instance && this._instance.data && this._instance.data.label) {
      return this._instance.data.label;
    }

    let fallback = this._instance.savedLabel || ["sidebar.loading"];

    switch (this._protocol) {
      case "itch:": {
        switch (this._hostname) {
          case "featured":
            return "itch.io";
          case "preferences":
            return ["sidebar.preferences"];
          case "library":
            return ["sidebar.owned"];
          case "dashboard":
            return ["sidebar.dashboard"];
          case "downloads":
            return ["sidebar.downloads"];
          case "preferences":
            return ["sidebar.preferences"];
          case "new-tab":
            return ["sidebar.new_tab"];
          case "locations":
            return this.location().path || fallback;
          case "applog":
            return ["sidebar.applog"];
          default:
            return this._querylessURL || "Error";
        }
      }

      default: {
        switch (this.prefix) {
          case "games": {
            return this.game().title || fallback;
          }
          case "users": {
            const u = this.user();
            return u.displayName || u.username || fallback;
          }
          case "locations": {
            return this.location().path || fallback;
          }
        }
      }
    }

    return fallback;
  }

  isSleepy(): boolean {
    return this._instance.sleepy;
  }

  canGoBack(): boolean {
    if (this._instance && this._instance.currentIndex > 0) {
      return true;
    }
    return false;
  }

  canGoForward(): boolean {
    if (
      this._instance &&
      this._instance.currentIndex < this._instance.history.length - 1
    ) {
      return true;
    }
    return false;
  }
}

const fallbackIcon = "moon";
