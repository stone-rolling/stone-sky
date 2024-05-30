import { serveDir } from "https://deno.land/std@0.223.0/http/file_server.ts";

// 単語リスト
const words = ["しりとり", "りんご", "ごま", "まりも", "もも", "もうし", "しんじ", "じんじ",
               "じゃがいも", "もうふ", "いす", "すいか", "あめ", "あさり", "いわ", "おみやげ",
               "うま", "うちわ", "わかめ", "わに", "にんにく", "くつ", "きのこ", "すし",
               "ねぎ", "はさみ", "のこぎり", "まぐろ", "ものさし", "めだか"];

// カタカナをひらがなに変換する関数
function katakanaToHiragana(input) {
  return input.replace(/[\u30a1-\u30f6]/g, function(match) {
    const chr = match.charCodeAt(0) - 0x60;
    return String.fromCharCode(chr);
  });
}

// カタカナとひらがなのみを扱う関数
function toHiragana(input) {
  return katakanaToHiragana(input);
}

// ランダムな最初の単語を選択する関数
function getRandomWord() {
  const randomIndex = Math.floor(Math.random() * words.length);
  return words[randomIndex];
}

// 直前の単語を保持しておく
let wordHistories = [getRandomWord()];



// 特殊ケースを処理する関数
function handleSpecialCases(word) {
  // 「ゃ」「ゅ」「ょ」で終わる場合
  if (word.slice(-1) === "ゃ") return word.slice(0, -1) + "や";
  if (word.slice(-1) === "ゅ") return word.slice(0, -1) + "ゆ";
  if (word.slice(-1) === "ょ") return word.slice(0, -1) + "よ";

  // 「ー」で終わる場合
  if (word.slice(-1) === "ー") {
    // 最後の「ー」の前の文字を探す
    const vowels = { あ: "あ", い: "い", う: "う", え: "え", お: "お",
                     か: "か", き: "き", く: "く", け: "け", こ: "こ",
                     さ: "さ", し: "し", す: "す", せ: "せ", そ: "そ",
                     た: "た", ち: "ち", つ: "つ", て: "て", と: "と",
                     な: "な", に: "に", ぬ: "ぬ", ね: "ね", の: "の",
                     は: "は", ひ: "ひ", ふ: "ふ", へ: "へ", ほ: "ほ",
                     ま: "ま", み: "み", む: "む", め: "め", も: "も",
                     や: "や", ゆ: "ゆ", よ: "よ",
                     ゃ: "や", ゅ: "ゆ", ょ: "よ",
                     ら: "ら", り: "り", る: "る", れ: "れ", ろ: "ろ",
                     わ: "わ", ゐ: "ゐ", ゑ: "ゑ", を: "を",
                     が: "が", ぎ: "ぎ", ぐ: "ぐ", げ: "げ", ご: "ご",
                     ざ: "ざ", じ: "じ", ず: "ず", ぜ: "ぜ", ぞ: "ぞ",
                     だ: "だ", ぢ: "ぢ", づ: "づ", で: "で", ど: "ど",
                     ば: "ば", び: "び", ぶ: "ぶ", べ: "べ", ぼ: "ぼ",
                     ぱ: "ぱ", ぴ: "ぴ", ぷ: "ぷ", ぺ: "ぺ", ぽ: "ぽ",
                     ぁ: "あ", ぃ: "い", ぅ: "う", ぇ: "え", ぉ: "お",
                    };
    const lastChar = word.slice(-2, -1);
    return vowels[lastChar] || word.slice(0, -1);
  }

  return word;
}

// localhostにDenoのHTTPサーバーを展開
Deno.serve(async (request) => {
  const pathname = new URL(request.url).pathname;
  console.log(`pathname: ${pathname}`);

  let previousWord = wordHistories[wordHistories.length - 1];

  if (request.method === "GET" && pathname === "/shiritori") {
    return new Response(previousWord, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  if (request.method === "POST" && pathname === "/shiritori") {
    const requestJson = await request.json();
    const nextWord = requestJson["nextWord"];
    const nextWordHiragana = toHiragana(nextWord);

    if (nextWordHiragana.slice(-1) === "ん") {
      return new Response(
        JSON.stringify({
          "errorMessage": "単語が「ん」で終わっています。ゲーム終了です。",
          "errorCode": "10004"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json; charset=utf-8" },
        }
      );
    }

    if (isVerbOrAdjective(nextWord)) {
      return new Response(
        JSON.stringify({
          "errorMessage": "動詞または形容詞が入力されました。使用できません。",
          "errorCode": "10006"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json; charset=utf-8" },
        }
      );
    }

    const previousWordHiragana = toHiragana(previousWord);
    const adjustedPreviousWord = handleSpecialCases(previousWordHiragana);

    if (nextWordHiragana === previousWordHiragana) {
      return new Response(
        JSON.stringify({
          "errorMessage": "同じ単語が連続して入力されました。ゲーム終了です。",
          "errorCode": "10005"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json; charset=utf-8" },
        }
      );
    }

    if (wordHistories.some(word => toHiragana(word) === nextWordHiragana)) {
      return new Response(
        JSON.stringify({
          "errorMessage": "同じ単語が既に使用されています",
          "errorCode": "10003"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json; charset=utf-8" },
        }
      );
    }

    if (adjustedPreviousWord.slice(-1) === nextWordHiragana.slice(0, 1)) {
      wordHistories.push(nextWord);
      previousWord = nextWord;
    } else {
      return new Response(
        JSON.stringify({
          "errorMessage": "前の単語に続いていません",
          "errorCode": "10001"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json; charset=utf-8" },
        }
      );
    }

    return new Response(previousWord, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  if (request.method === 'POST' && pathname === '/reset') {
    wordHistories = [getRandomWord()];
    previousWord = wordHistories[wordHistories.length - 1];
    return new Response(previousWord, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return serveDir(
    request,
    {
      fsRoot: "./public-1/",
      urlRoot: "",
      enableCors: true,
    }
  );
});
