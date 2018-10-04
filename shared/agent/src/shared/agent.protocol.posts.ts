"use strict";
import { Range, RequestType, TextDocumentIdentifier } from "vscode-languageserver-protocol";
import {
	CSCreatePostRequestCodeBlock,
	CSCreatePostRequestStream,
	CSPost,
	CSReactions
} from "./api.protocol";

export type CreatePostRequest =
	| CreatePostInChannelOrDirectStreamRequest
	| CreatePostInFileStreamRequest;

export interface CreatePostInChannelOrDirectStreamRequest {
	streamId: string;
	text: string;
	mentionedUserIds?: string[];
	parentPostId?: string;
	codeBlocks?: CSCreatePostRequestCodeBlock[];
	commitHashWhenPosted?: string;
}

export interface CreatePostInFileStreamRequest {
	stream: CSCreatePostRequestStream;
	text: string;
	mentionedUserIds?: string[];
	parentPostId?: string;
	codeBlocks?: CSCreatePostRequestCodeBlock[];
	commitHashWhenPosted?: string;
}

export interface CreatePostResponse {
	post: CSPost;
}

export const CreatePostRequestType = new RequestType<
	CreatePostRequest,
	CreatePostResponse,
	void,
	void
>("codeStream/posts/create");

export interface CodeBlockSource {
	file: string;
	repoPath: string;
	revision: string;
	authors: { id: string; username: string }[];
	remotes: { name: string; url: string }[];
}

export interface CreatePostWithCodeRequest {
	textDocument: TextDocumentIdentifier;
	text: string;
	mentionedUserIds: string[];
	code: string;
	location?: [number, number, number, number];
	source?: CodeBlockSource;
	parentPostId?: string;
	streamId: string;
}

export const CreatePostWithCodeRequestType = new RequestType<
	CreatePostWithCodeRequest,
	CSPost,
	void,
	void
>("codeStream/posts/createWithCode");

export interface FetchLatestPostRequest {
	streamId: string;
}

export interface FetchLatestPostResponse {
	post: CSPost;
}

export const FetchLatestPostRequestType = new RequestType<
	FetchLatestPostRequest,
	FetchLatestPostResponse,
	void,
	void
>("codeStream/posts/latest");

export interface FetchPostRepliesRequest {
	streamId: string;
	id: string;
}

export interface FetchPostRepliesResponse {
	posts: CSPost[];
}

export const FetchPostRepliesRequestType = new RequestType<
	FetchPostRepliesRequest,
	FetchPostRepliesResponse,
	void,
	void
>("codeStream/post/replies");

export interface FetchPostsRequest {
	streamId: string;
	limit: number;
	beforeSeq?: number;
	afterSeq?: number;
}

export interface FetchPostsResponse {
	posts: CSPost[];
	maxSeq?: number;
}

export const FetchPostsRequestType = new RequestType<
	FetchPostsRequest,
	FetchPostsResponse,
	void,
	void
>("codeStream/posts");

export interface FetchPostsByRangeRequest {
	streamId: string;
	range: string;
}

export interface FetchPostsByRangeResponse {
	posts: CSPost[];
	more?: boolean;
}

export const FetchPostsByRangeRequestType = new RequestType<
	FetchPostsByRangeRequest,
	FetchPostsByRangeResponse,
	void,
	void
>("codeStream/posts/byRange");

export interface DeletePostRequest {
	streamId: string;
	id: string;
}

export interface DeletePostResponse {
	post: CSPost;
}

export const DeletePostRequestType = new RequestType<
	DeletePostRequest,
	DeletePostResponse,
	void,
	void
>("codeStream/post/delete");

export interface EditPostRequest {
	streamId: string;
	id: string;
	text: string;
	mentionedUserIds?: string[];
}

export interface EditPostResponse {
	post: CSPost;
}

export const EditPostRequestType = new RequestType<EditPostRequest, EditPostResponse, void, void>(
	"codeStream/post/edit"
);

export interface GetPostRequest {
	streamId: string;
	id: string;
}

export interface GetPostResponse {
	post: CSPost;
}

export const GetPostRequestType = new RequestType<GetPostRequest, GetPostResponse, void, void>(
	"codeStream/post"
);

export interface MarkPostUnreadRequest {
	streamId: string;
	id: string;
}

export interface MarkPostUnreadResponse {
	post: { [key: string]: any };
}

export const MarkPostUnreadRequestType = new RequestType<
	MarkPostUnreadRequest,
	MarkPostUnreadResponse,
	void,
	void
>("codeStream/post/markUnread");

export interface PreparePostWithCodeRequest {
	textDocument: TextDocumentIdentifier;
	range: Range;
	dirty: boolean;
}

export interface PreparePostWithCodeResponse {
	code: string;
	source?: CodeBlockSource;
	gitError?: string;
}

export const PreparePostWithCodeRequestType = new RequestType<
	PreparePostWithCodeRequest,
	PreparePostWithCodeResponse,
	void,
	void
>("codeStream/post/prepareWithCode");

export interface ReactToPostRequest {
	streamId: string;
	id: string;
	emojis: CSReactions;
}

export interface ReactToPostResponse {
	post: CSPost;
}

export const ReactToPostRequestType = new RequestType<
	ReactToPostRequest,
	ReactToPostResponse,
	void,
	void
>("codeStream/post/react");
