# GPT AI Assistant

<div align="center">

[![license](https://img.shields.io/pypi/l/ansicolortags.svg)](LICENSE) [![Release](https://img.shields.io/github/release/memochou1993/gpt-ai-assistant)](https://GitHub.com/memochou1993/gpt-ai-assistant/releases/)

</div>

GPT AI Assistant is an application that is implemented using the OpenAI API and LINE Messaging API. Through the installation process, you can start chatting with your own AI assistant using the LINE mobile app.

## LINEグループ議論支援Bot設定メモ

このForkでは、日本語のLINEグループで議論支援AIとして使う前提のデフォルト設定にしています。1対1トークでは従来通り通常メッセージに返信し、グループトークでは `BOT_NAME` で始まるテキストだけに返信します。デフォルトの呼び出し名は `@gpt` です。

### Webhook URL

Vercelにデプロイした後、LINE DevelopersのWebhook URLには次を設定します。

```text
https://{vercel-domain}/webhook
```

`APP_WEBHOOK_PATH` を変更した場合は、末尾の `/webhook` も同じ値に変更してください。

### 必須環境変数

```env
LINE_CHANNEL_SECRET=
LINE_CHANNEL_ACCESS_TOKEN=
OPENAI_API_KEY=
```

### 推奨環境変数

```env
APP_LANG=ja
APP_WEBHOOK_PATH=/webhook
BOT_NAME=@gpt
OPENAI_COMPLETION_MODEL=gpt-4o-mini
APP_MAX_PROMPT_MESSAGES=10
APP_MAX_PROMPT_TOKENS=2048
OPENAI_COMPLETION_MAX_TOKENS=500
```

`BOT_INIT_PROMPT` は未設定でも議論整理AI向けの日本語プロンプトが使われます。変更する場合は、VercelのEnvironment Variablesで上書きしてください。

### 任意環境変数

```env
SERPAPI_API_KEY=
VERCEL_ACCESS_TOKEN=
VERCEL_PROJECT_NAME=
VERCEL_TEAM_ID=
VERCEL_DEPLOY_HOOK_URL=
```

`SERPAPI_API_KEY` はWeb検索機能を使う場合に必要です。`VERCEL_ACCESS_TOKEN`、`VERCEL_PROJECT_NAME`、`VERCEL_TEAM_ID` は既存のVercel環境変数ストレージや再デプロイコマンドを使う場合に必要です。会話プロンプトと履歴は現在メモリ上で直近分だけ保持します。

### グループでの呼び出し仕様

- グループでは `@gpt` で始まるテキストだけに返信します。
- 通常発言や文中に `@gpt` が含まれるだけの発言には返信しません。
- OpenAIへ渡す本文からは先頭の `@gpt` を削除します。
- `@gpt` だけの発言には「質問内容を入力してください。」と返します。
- 1対1トークでは従来通り全メッセージに返信します。

例:

```text
@gpt この議論を整理して
@gpt A案とB案を比較して
@gpt 次に決めるべきことを出して
```

### 会話履歴

- グループでは `groupId` 単位、1対1では `userId` 単位で会話プロンプトを分けます。
- AI APIに渡す会話メッセージは `APP_MAX_PROMPT_MESSAGES` の直近件数だけです。
- デフォルトは10件です。11件目以降は古いものから削除します。
- トークン上限は `APP_MAX_PROMPT_TOKENS` で調整できます。

### モデル変更

OpenAIモデルは `OPENAI_COMPLETION_MODEL` で変更できます。

```env
OPENAI_COMPLETION_MODEL=gpt-4o-mini
```

候補:

- `gpt-4o-mini`
- `gpt-4.1-mini`
- `gpt-4o`

モデルを変えたらVercelでEnvironment Variablesを更新し、再デプロイしてください。

### 今後調整できるBot設計項目

AIの性格:

- 議論整理役
- BizDev壁打ち役
- プロダクト開発参謀
- 技術相談役
- 意思決定支援役

返答スタイル:

- 簡潔
- 箇条書き中心
- 結論ファースト
- 反論も出す
- 次アクションまで出す
- 雑談はしない

呼び出し名:

- `@gpt`
- `@ai`
- `@Gemini`
- `@Keisuke`

会話履歴:

- 直近何件を参照するか
- グループ単位かユーザー単位か
- 古い履歴を要約するか
- DBに移行するか

モデル:

- `gpt-4o-mini`
- `gpt-4.1-mini`
- `gpt-4o`
- Gemini APIへ変更する可能性

残す機能:

- テキスト会話
- 音声入力
- 画像生成
- Web検索
- 翻訳
- 要約
- リトライ
- 忘却コマンド

削除候補:

- 使わないコマンド
- 占い・分析系
- デプロイ系コマンド
- 過剰な多言語対応
- 不要なWeb検索機能

## News

- 2023-03-05: The `4.1` version now support the audio message of LINE and  `whisper-1` language model of OpenAI. :fire:
- 2023-03-02: The `4.0` version now support `gpt-3.5-turbo` language model of OpenAI. :fire:

## Documentations

- <a href="https://memochou1993.github.io/gpt-ai-assistant-docs/" target="_blank">中文</a>
- <a href="https://memochou1993.github.io/gpt-ai-assistant-docs/en" target="_blank">English</a>

## Credits

- [jayer95](https://github.com/jayer95) - Debugging and testing
- [kkdai](https://github.com/kkdai) - Idea of `sum` command
- [Dayu0815](https://github.com/Dayu0815) - Idea of `search` command
- [mics8128](https://github.com/mics8128) - Implementing new features
- [All other contributors](https://github.com/memochou1993/gpt-ai-assistant/graphs/contributors)

## Contact

If there is any question, please contact me at memochou1993@gmail.com. Thank you.

## Changelog

Detailed changes for each release are documented in the [release notes](https://github.com/memochou1993/gpt-ai-assistant/releases).

## License

[MIT](LICENSE)
