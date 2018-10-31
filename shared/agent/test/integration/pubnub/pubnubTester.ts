"use strict";

import * as Randomstring from "randomstring";
import { Disposable } from "vscode-languageserver";
import { CodeStreamApiProvider } from "../../../src/api/codestream/codestreamApi";
import { PubnubConnection, PubnubInitializer } from "../../../src/pubnub/pubnubConnection";
import { ApiRequester, ApiRequestOverrides } from "./apiRequester";
import {
	CreatePostRequest,
	CreatePostResponse,
	CreateStreamRequest,
	CreateStreamResponse,
	CreateTeamRequest,
	CreateTeamResponse,
	InviteUserRequest,
	LoginResponse,
	PostData,
	StreamData,
	TeamData
} from "./types";
import { UserCreator } from "./userCreator";

export interface PubnubTesterConfig {
	apiOrigin: string;
}

class CodeStreamApiSimulator {
	constructor(private _apiRequester: ApiRequester) {}

	async grant(token: string, channel: string) {
		const request = {
			method: "PUT",
			path: `/grant/${channel}`,
			data: {},
			token
		};
		await this._apiRequester.request(request);
	}
}

let TEST_NUM = 0;

export abstract class PubnubTester {
	public testNum: number = 0;

	protected _userData: LoginResponse | undefined;
	protected _otherUserData: LoginResponse | undefined;
	protected _teamData: TeamData | undefined;
	protected _streamData: StreamData | undefined;
	protected _postData: PostData | undefined;
	protected _pubnubConnection: PubnubConnection | undefined;
	private _pubnubDisposable: Disposable | undefined;
	protected _api: CodeStreamApiProvider | undefined;
	protected _apiRequester: ApiRequester;
	protected _apiSimulator: CodeStreamApiSimulator | undefined;
	protected _successTimeout: NodeJS.Timer | undefined;
	protected _resolve: any;
	protected _reject: any;
	protected _startOffline: boolean = false;
	protected _testTimeout: number = 10000;
	protected _statusListener: Disposable | undefined;
	protected _messageListener: Disposable | undefined;
	protected _pubnubToken: string | undefined;

	constructor(config: PubnubTesterConfig) {
		this._apiRequester = new ApiRequester({ origin: config.apiOrigin });
		this._api = new CodeStreamApiProvider(
			"",
			{
				extension: {
					build: "",
					buildEnv: "",
					version: "",
					versionFormatted: ""
				},
				ide: { name: "", version: "" }
			},
			undefined
		);
		this._apiSimulator = new CodeStreamApiSimulator(this._apiRequester);
		this._api.grantPubNubChannelAccess = this._apiSimulator.grant.bind(this._apiSimulator);
		this.testNum = ++TEST_NUM;
	}

	describe() {
		return "???";
	}

	async before() {
		await this.createUser();
		this.initializeConnection();
	}

	async after() {
		this._pubnubDisposable!.dispose();
		delete this._pubnubConnection;
		if (this._successTimeout) {
			clearTimeout(this._successTimeout);
		}
		if (this._statusListener) {
			this._statusListener.dispose();
		}
		if (this._messageListener) {
			this._messageListener.dispose();
		}
	}

	run(): Promise<void> {
		this.setSuccessTimeout();
		return new Promise((resolve, reject) => {
			this._resolve = resolve;
			this._reject = reject;
		});
	}

	getTestTimeout() {
		return this._testTimeout;
	}

	private async createUser() {
		this._userData = await new UserCreator(this._apiRequester).createUser();
	}

	protected async createOtherUser() {
		this._otherUserData = await new UserCreator(this._apiRequester).createUser();
	}

	private initializeConnection() {
		this._pubnubConnection = new PubnubConnection(this._api!, undefined);
		this._pubnubDisposable = this._pubnubConnection.initialize({
			subscribeKey: this._userData!.pubnubKey,
			authKey: this._pubnubToken || this._userData!.pubnubToken,
			accessToken: this._userData!.accessToken,
			userId: this._userData!.user._id,
			online: this._startOffline ? false : true,
			testMode: true
			// 			debug: this.debug.bind(this)
		} as PubnubInitializer);
	}

	protected async createTeamAndStream() {
		this._apiRequester.setToken(this._userData!.accessToken);
		await this.createTeam();
		await this.createOtherUser();
		await this.inviteOtherUser();
		await this.createChannel();
	}

	protected async createTeam(options: ApiRequestOverrides = {}) {
		const teamName = Randomstring.generate(12);
		const data = {
			name: teamName
		} as CreateTeamRequest;
		Object.assign(data, options.data || {});
		const request = {
			method: "POST",
			path: "/teams",
			data
		};
		Object.assign(request, options);
		const response = (await this._apiRequester.request(request)) as CreateTeamResponse;
		this._teamData = response.team;
	}

	protected async inviteOtherUser(options: ApiRequestOverrides = {}) {
		const data = {
			teamId: this._teamData!._id,
			email: this._otherUserData!.user.email
		} as InviteUserRequest;
		Object.assign(data, options.data || {});
		const request = {
			method: "POST",
			path: "/users",
			data
		};
		Object.assign(request, options);
		await this._apiRequester.request(request);
	}

	protected async createChannel(options: ApiRequestOverrides = {}) {
		const streamName = Randomstring.generate(12);
		const data = {
			teamId: this._teamData!._id,
			type: "channel",
			name: streamName,
			memberIds: [this._otherUserData!.user._id]
		} as CreateStreamRequest;
		Object.assign(data, options.data || {});
		const request = {
			method: "POST",
			path: "/streams",
			data
		};
		Object.assign(request, options);
		const response = (await this._apiRequester.request(request)) as CreateStreamResponse;
		this._streamData = response.stream;
	}

	protected async createPost(options: ApiRequestOverrides = {}) {
		const text = Randomstring.generate(100);
		const data = {
			streamId: this._streamData!._id,
			text
		} as CreatePostRequest;
		Object.assign(data, options.data || {});
		const request = {
			method: "POST",
			path: "/posts",
			data
		};
		const response = (await this._apiRequester.request(request)) as CreatePostResponse;
		this._postData = response.post;
	}

	protected subscribeToUserChannel() {
		this._pubnubConnection!.subscribe([`user-${this._userData!.user._id}`]);
	}

	protected subscribeToStreamChannel() {
		this._pubnubConnection!.subscribe([`stream-${this._streamData!._id}`]);
	}

	private setSuccessTimeout() {
		this._successTimeout = setTimeout(() => {
			this._reject("timed out");
			delete this._successTimeout;
		}, this._testTimeout);
	}

	private debug(msg: string, info?: any) {
		const now = new Date().toString();
		msg = `${now}: TEST ${this.testNum}: ${msg}`;
		if (info) {
			msg += `: ${JSON.stringify(info, undefined, 10)}`;
		}
		console.log(msg);
	}
}
