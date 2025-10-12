'use client';

import { useEffect, useMemo } from "react";
import { createOpenAI } from "@ai-sdk/openai";
import { BlockNoteEditor, filterSuggestionItems } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { en } from "@blocknote/core/locales";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  FormattingToolbar,
  FormattingToolbarController,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  getFormattingToolbarItems,
  useCreateBlockNote,
} from "@blocknote/react";
import {
  AIMenuController,
  AIToolbarButton,
  ClientSideTransport,
  createAIExtension,
  fetchViaProxy,
  getAISlashMenuItems,
} from "@blocknote/xl-ai";
import { en as aiEn } from "@blocknote/xl-ai/locales";

const getEnv = (key: string) => {
  if (typeof process !== "undefined" && process.env) {
    return (
      process.env[`NEXT_PUBLIC_${key}` as keyof NodeJS.ProcessEnv] ||
      process.env[key as keyof NodeJS.ProcessEnv]
    );
  }
  return undefined;
};

export interface BlockNoteEditorRef {
  document: any;
  blocksToHTMLLossy: (blocks: any) => string;
  tryParseHTMLToBlocks: (html: string) => any[];
  replaceBlocks: (currentBlocks: any[], newBlocks: any[]) => void;
}

interface BlockNoteEditorWithAIProps {
  onContentChange?: (content: any) => void;
  editorRef?: React.MutableRefObject<BlockNoteEditorRef | null>;
}

export default function BlockNoteEditorWithAI({ onContentChange, editorRef }: BlockNoteEditorWithAIProps) {
  const baseUrl =
    getEnv("BLOCKNOTE_AI_SERVER_BASE_URL") ||
    (typeof window !== "undefined" ? `${window.location.origin}/api/ai` : "/api/ai");

  const model = useMemo(
    () =>
      createOpenAI({
        apiKey: "unused",
        fetch: fetchViaProxy((url) => `${baseUrl}/proxy?provider=openai&url=${encodeURIComponent(url)}`),
      })("gpt-4o"),
    [baseUrl]
  );

  const aiTransport = useMemo(
    () =>
      new ClientSideTransport({
        model,
      }),
    [model]
  );

  const aiExtension = useMemo(
    () =>
      createAIExtension({
        transport: aiTransport,
      }),
    [aiTransport]
  );

  // BlockNote 에디터 생성 (빈 에디터로 시작)
  const editor = useCreateBlockNote({
    dictionary: {
      ...en,
      ai: aiEn,
    },
    extensions: [aiExtension],
    initialContent: [
      {
        type: "paragraph",
        content: "",
      },
    ],
  });

  // 에디터 참조 설정 - BlockNote 에디터 메서드 노출
  useEffect(() => {
    if (editorRef) {
      editorRef.current = {
        get document() {
          return editor.document;
        },
        blocksToHTMLLossy: (blocks: any) => {
          return editor.blocksToHTMLLossy(blocks);
        },
        tryParseHTMLToBlocks: (html: string) => {
          return editor.tryParseHTMLToBlocks(html);
        },
        replaceBlocks: (currentBlocks: any[], newBlocks: any[]) => {
          editor.replaceBlocks(currentBlocks, newBlocks);
        }
      };
    }
  }, [editor, editorRef]);

  // 콘텐츠 변경 시 부모 컴포넌트에 알림
  const handleChange = () => {
    if (onContentChange) {
      const blocks = editor.document;
      onContentChange(blocks);
    }
  };

  return (
    <div className="h-full">
      <BlockNoteView
        editor={editor}
        onChange={handleChange}
        theme="light"
        formattingToolbar={false}
        slashMenu={false}
      >
        <AIMenuController />

        <FormattingToolbarController
          formattingToolbar={() => (
            <FormattingToolbar>
              {...getFormattingToolbarItems()}
              <AIToolbarButton />
            </FormattingToolbar>
          )}
        />

        <SuggestionMenuWithAI editor={editor} />
      </BlockNoteView>
    </div>
  );
}

function SuggestionMenuWithAI({
  editor,
}: {
  editor: BlockNoteEditor<any, any, any>;
}) {
  return (
    <SuggestionMenuController
      triggerCharacter="/"
      getItems={async (query) =>
        filterSuggestionItems(
          [
            ...getDefaultReactSlashMenuItems(editor),
            ...getAISlashMenuItems(editor),
          ],
          query,
        )
      }
    />
  );
}
