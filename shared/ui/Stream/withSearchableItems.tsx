import React from "react";
import { CSReview, CodemarkType } from "@codestream/protocols/api";
import { CodemarkPlus } from "@codestream/protocols/agent";
import { CodeStreamState } from "@codestream/webview/store";
import { useSelector, useDispatch } from "react-redux";
import { orderBy } from "lodash-es";
import { createSelector } from "reselect";
import { mapFilter } from "@codestream/webview/utils";
import { useDidMount } from "@codestream/webview/utilities/hooks";
import { bootstrapReviews } from "@codestream/webview/store/reviews/actions";
import { SearchContext, SearchContextType } from "./SearchContextProvider";

type SearchableItems = (CSReview | CodemarkPlus)[];

export interface WithSearchableItemsProps extends SearchContextType {
	items: SearchableItems;
	branchOptions: string[];
	repoOptions: string[];
}

const getSearchableCodemarks = createSelector(
	(state: CodeStreamState) => state.codemarks,
	codemarksState => {
		return mapFilter(Object.values(codemarksState), codemark => {
			if (
				!codemark.isChangeRequest &&
				(codemark.type === CodemarkType.Comment || codemark.type === CodemarkType.Issue)
			) {
				return codemark;
			}
			return;
		});
	}
);

export function withSearchableItems<ChildProps extends WithSearchableItemsProps>(
	Child: React.ElementType<ChildProps>
) {
	return function WithSearchableItems(props: ChildProps) {
		const dispatch = useDispatch();
		const codemarks = useSelector(getSearchableCodemarks);
		const reviewsState = useSelector((state: CodeStreamState) => state.reviews);
		const reposState = useSelector((state: CodeStreamState) => state.repos);
		const searchContext = React.useContext(SearchContext);

		useDidMount(() => {
			if (!reviewsState.bootstrapped) {
				dispatch(bootstrapReviews());
			}
		});

		const items = React.useMemo(
			// sort by most recent first
			() => orderBy([...codemarks, ...Object.values(reviewsState.reviews)], "createdAt", "desc"),
			[codemarks, reviewsState]
		);

		const { branchOptions, repoOptions } = React.useMemo(() => {
			const branchNames = new Set<string>();
			const repoNames = new Set<string>();
			for (let [, review] of Object.entries(reviewsState.reviews)) {
				const { reviewChangesets = [] } = review;
				reviewChangesets.forEach(changeset => {
					const { branch, repoId } = changeset;
					branchNames.add(branch);
					const repo = reposState[repoId];
					if (repo) {
						repoNames.add(repo.name);
					}
				});
			}
			return { branchOptions: [...branchNames].sort(), repoOptions: [...repoNames].sort() };
		}, [reviewsState, reposState]);

		const providingProps: WithSearchableItemsProps = {
			items,
			branchOptions,
			repoOptions,
			...searchContext
		};

		return React.createElement(Child, {
			...props,
			...providingProps
		});
	};
}
