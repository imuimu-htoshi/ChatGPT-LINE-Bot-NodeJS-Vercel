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
APP_TIMEZONE=Asia/Tokyo
APP_DEFAULT_LOCATION=東京都
APP_PUBLIC_URL=https://{vercel-domain}
```

`BOT_INIT_PROMPT` は未設定でも議論整理AI向けの日本語プロンプトが使われます。変更する場合は、VercelのEnvironment Variablesで上書きしてください。

### 開発者限定で使うための環境変数

```env
APP_OWNER_USER_ID=Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
APP_ALLOWED_USER_IDS=Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
APP_ALLOWED_GROUP_IDS=Cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

- 1対1トークは `APP_ALLOWED_USER_IDS` に含まれる `userId` だけが利用できます。
- グループトークは `APP_ALLOWED_USER_IDS` に加えて `APP_ALLOWED_GROUP_IDS` に含まれる `groupId` だけが利用できます。
- 何も設定しなければ従来通り制限なしです。

### 任意環境変数

```env
SERPAPI_API_KEY=
VERCEL_ACCESS_TOKEN=
VERCEL_PROJECT_NAME=
VERCEL_TEAM_ID=
VERCEL_DEPLOY_HOOK_URL=
```

`SERPAPI_API_KEY` は任意です。未設定の場合、Web検索はOpenAIの組み込みWeb検索にフォールバックします。`VERCEL_ACCESS_TOKEN`、`VERCEL_PROJECT_NAME`、`VERCEL_TEAM_ID` は既存のVercel環境変数ストレージや再デプロイコマンドを使う場合に必要です。会話プロンプトと履歴は現在メモリ上で直近分だけ保持します。

### 入力ルーティング

このForkでは、受信テキストを最初に簡易判定してから既存ハンドラへ渡します。

- 通常の質問: 通常の会話ルート
- 文脈依存の質問: 直近履歴を付けて会話ルート
- 画像生成依頼: 画像生成ルート
- 最新情報、天気、ニュース、事実確認: Web検索ルート

履歴は毎回投入せず、`この件どう思う？` や `さっきの続きを` のように前提が省略された入力だけに絞って使います。

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
- AI APIに渡す会話メッセージは、履歴が必要と判定された場合だけ `APP_MAX_PROMPT_MESSAGES` の直近件数を使います。
- デフォルトは10件です。11件目以降は古いものから削除します。
- トークン上限は `APP_MAX_PROMPT_TOKENS` で調整できます。

### 最新情報と天気

- `天気`、`ニュース`、`最新`、`現在` などの鮮度依存の質問は、自動で検索ルートに入ります。
- `明日`、`今日`、`来週` などの相対日付は `APP_TIMEZONE` を基準に絶対日付へ解決してから検索します。
- 例: 日本時間で 2026-07-06 に `明日の天気` と送ると、内部では `2026-07-07` を含む検索クエリに変換します。
- `SERPAPI_API_KEY` が設定されていればSerpAPIで検索し、未設定ならOpenAIの組み込みWeb検索（Responses API）で回答します。

### コストログ

```env
APP_COST_LOG_ENABLED=true
OPENAI_COMPLETION_INPUT_PRICE_PER_1M=
OPENAI_COMPLETION_OUTPUT_PRICE_PER_1M=
OPENAI_IMAGE_MODEL=gpt-image-1-mini
OPENAI_IMAGE_QUALITY=low
OPENAI_IMAGE_OUTPUT_FORMAT=jpeg
OPENAI_IMAGE_OUTPUT_COMPRESSION=80
```

- OpenAI応答ごとに、使用モデル、入力トークン、出力トークン、推定コストをサーバーログへ出します。
- `OPENAI_COMPLETION_INPUT_PRICE_PER_1M` と `OPENAI_COMPLETION_OUTPUT_PRICE_PER_1M` を設定すると、任意モデルでも推定コストを上書きできます。
- 画像生成は `OPENAI_IMAGE_MODEL` が `gpt-image-2`、`gpt-image-1.5`、`gpt-image-1-mini` のいずれかなら推定コストを出します。

### 画像生成の注意

- OpenAI の最新画像APIは base64 画像を返すため、このForkでは一時URL `/generated-images/:id` 経由で LINE に渡します。
- `APP_PUBLIC_URL` は必須です。Vercel 本番URLか独自ドメインを入れてください。
- OpenAI 側で画像生成モデルの利用に Organization Verification が必要な場合があります。

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

料金計算も使う場合は、同じモデルに合わせて `OPENAI_COMPLETION_INPUT_PRICE_PER_1M` と `OPENAI_COMPLETION_OUTPUT_PRICE_PER_1M` も合わせて更新してください。

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
