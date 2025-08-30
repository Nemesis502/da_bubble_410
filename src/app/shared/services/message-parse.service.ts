import { Injectable } from '@angular/core';

export type TextPart = {
  text: string;
  isMention: boolean;
  isHashtag: boolean;
};

@Injectable({
  providedIn: 'root',
})
export class MessageParserService {
  constructor() {}

  /** ---------------- Main Entry ---------------- */
  /** Parses a message into segments with mentions and hashtags */
  parseMessageWithMentionsAndHashtags(messageText: string): TextPart[] {
    const mentionParts = this.parseMentions(messageText);
    return this.parseHashtags(mentionParts);
  }

  /** ---------------- Mentions ---------------- */
  /** Extracts @mentions from the text */
  parseMentions(messageText: string): TextPart[] {
    const mentionRegex = /@[\wäöüÄÖÜß]+(?: [\wäöüÄÖÜß]+)*(?=\s|$|[.,!?:])/g;
    return this.splitByRegex(messageText, mentionRegex, (match) => ({
      text: match,
      isMention: true,
      isHashtag: false,
    }));
  }

  /** ---------------- Hashtags ---------------- */
  /** Extracts #hashtags from text parts, ignoring mentions */
  parseHashtags(parts: TextPart[]): TextPart[] {
    const hashtagRegex = /#[\wäöüÄÖÜß]+/g;
    return parts.flatMap((part) =>
      part.isMention
        ? [part]
        : this.splitByRegex(part.text, hashtagRegex, (match) => ({
            text: match,
            isMention: false,
            isHashtag: true,
          }))
    );
  }

  /** ---------------- Core Helper ---------------- */
  /** Generic regex splitter that wraps matches with a marker function */
  private splitByRegex(
    text: string,
    regex: RegExp,
    marker: (match: string) => TextPart
  ): TextPart[] {
    regex.lastIndex = 0; // reset regex state
    const result: TextPart[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      this.addPlainText(result, text, lastIndex, match.index);
      result.push(marker(match[0]));
      lastIndex = match.index + match[0].length;
    }

    this.addPlainText(result, text, lastIndex, text.length);
    return result;
  }

  /** ---------------- Plain Text Helper ---------------- */
  /** Adds non-mention, non-hashtag text to result array */
  private addPlainText(
    result: TextPart[],
    text: string,
    start: number,
    end: number
  ): void {
    if (end > start) {
      result.push({
        text: text.slice(start, end),
        isMention: false,
        isHashtag: false,
      });
    }
  }
}
