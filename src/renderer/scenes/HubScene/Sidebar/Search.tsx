import classNames from "classnames";
import { actions } from "common/actions";
import React from "react";
import { InjectedIntl } from "react-intl";
import LoadingCircle from "renderer/basics/LoadingCircle";
import { hook } from "renderer/hocs/hook";
import watching, { Watcher } from "renderer/hocs/watching";
import { withIntl } from "renderer/hocs/withIntl";
import SearchResultsBar from "renderer/scenes/HubScene/Sidebar/SearchResultsBar";
import styled, * as styles from "renderer/styles";
import { TString } from "renderer/t";
import { debounce } from "underscore";
import { Dispatch } from "common/types";

const SearchContainerContainer = styled.section`
  .relative-wrapper {
    position: relative;
    height: 0;
  }
`;

const SearchContainer = styled.div`
  position: relative;
  padding: 0px 8px;
  margin: 16px 0;
  margin-left: 2px;
  margin-left: 10px;
  font-size: 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.3);

  transition: border-color 0.4s;
  &.open {
    border-color: rgba(255, 255, 255, 0.4);
  }

  input[type="search"] {
    ${styles.searchInput()} // mixin!
    width: 100%;
    margin-left: 4px;
    height: 32px;
    font-size: inherit;

    &:focus {
      outline: none;
    }
  }

  .search-icon {
    ${styles.searchIcon()};
    left: 10px;
    font-size: inherit;
  }
`;

@watching
class Search extends React.PureComponent<Props> {
  input: HTMLInputElement;

  trigger = debounce(() => {
    if (!this.input) {
      return;
    }
    this.props.dispatch(actions.search({ query: this.input.value }));
  }, 100);

  onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    this.props.dispatch(actions.focusSearch({}));
  };

  onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    this.props.dispatch(actions.closeSearch({}));
  };

  onChange = (e: React.FormEvent<HTMLInputElement>) => {
    this.trigger();
  };

  onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const { key } = e;

    let passthrough = false;

    if (key === "Escape") {
      // default behavior is to clear - don't
    } else if (key === "ArrowDown") {
      this.props.dispatch(
        actions.searchHighlightOffset({ offset: 1, relative: true })
      );
      // default behavior is to jump to end of input - don't
    } else if (key === "ArrowUp") {
      this.props.dispatch(
        actions.searchHighlightOffset({ offset: -1, relative: true })
      );
      // default behavior is to jump to start of input - don't
    } else {
      passthrough = true;
    }

    if (!passthrough) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    return true;
  };

  onKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const { key } = e;

    if (key === "Escape") {
      return;
    } else if (key === "ArrowDown") {
      return;
    } else if (key === "ArrowUp") {
      return;
    } else if (key === "Enter") {
      return;
    }

    this.trigger();
  };

  subscribe(watcher: Watcher) {
    watcher.on(actions.commandBack, async (store, action) => {
      if (this.input) {
        this.props.dispatch(actions.closeSearch({}));
      }
    });
  }

  render() {
    const { intl, open, loading } = this.props;

    return (
      <SearchContainerContainer>
        <SearchContainer className={classNames({ open })}>
          <input
            id="search"
            ref={this.gotInput}
            type="search"
            placeholder={TString(intl, ["search.placeholder"]) + "..."}
            onKeyDown={this.onKeyDown}
            onKeyUp={this.onKeyUp}
            onChange={this.onChange}
            onBlur={this.onBlur}
            onFocus={this.onFocus}
          />
          {loading ? (
            <LoadingCircle className="search-icon" progress={-1} />
          ) : (
            <span className="icon icon-search search-icon" />
          )}
          <div className="relative-wrapper">
            <SearchResultsBar />
          </div>
        </SearchContainer>
      </SearchContainerContainer>
    );
  }

  gotInput = (input: HTMLInputElement) => {
    this.input = input;
  };
}

interface Props {
  open: boolean;
  loading: boolean;
  dispatch: Dispatch;
  intl: InjectedIntl;
}

export default hook(map => ({
  open: map(rs => rs.profile.search.open),
  loading: map(rs => rs.profile.search.loading),
}))(withIntl(Search));
