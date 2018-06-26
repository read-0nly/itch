import { messages } from "common/butlerd";
import { Space } from "common/helpers/space";
import { Dispatch } from "common/types";
import React from "react";
import butlerCaller from "renderer/hocs/butlerCaller";
import { withDispatch } from "renderer/hocs/withDispatch";
import { withSpace } from "renderer/hocs/withSpace";
import FiltersContainer from "renderer/basics/FiltersContainer";

const FetchGame = butlerCaller(messages.FetchGame);

class GamePage extends React.PureComponent<Props> {
  render() {
    const { space, dispatch } = this.props;
    const gameId = space.firstPathNumber();

    return (
      <FetchGame
        params={{ gameId }}
        loadingHandled
        render={({ loading }) => <FiltersContainer loading={loading} />}
        onResult={result => {
          if (result) {
            const { game } = result;
            if (game) {
              dispatch(
                space.makeEvolve({
                  url: game.url,
                  resource: `games/${gameId}`,
                  replace: true,
                })
              );
            }
          }
        }}
      />
    );
  }
}

interface Props {
  space: Space;
  dispatch: Dispatch;
}

export default withSpace(withDispatch(GamePage));
