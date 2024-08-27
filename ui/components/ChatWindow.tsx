'use client';

import { useEffect, useRef, useState } from 'react';
import { Document } from '@langchain/core/documents';
import Navbar from './Navbar';
import Chat from './Chat';
import EmptyChat from './EmptyChat';
import crypto from 'crypto';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';
import { getSuggestions } from '@/lib/actions';
import Error from 'next/error';

export type Message = {
  messageId: string;
  chatId: string;
  createdAt: Date;
  content: string;
  role: 'user' | 'assistant';
  suggestions?: string[];
  sources?: Document[];
};

const useSocket = (
  url: string,
  setIsWSReady: (ready: boolean) => void,
  setError: (error: boolean) => void,
) => {
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    if (!ws) {
      const connectWs = async () => {
        let chatModel = localStorage.getItem('chatModel');
        let chatModelProvider = localStorage.getItem('chatModelProvider');
        let embeddingModel = localStorage.getItem('embeddingModel');
        let embeddingModelProvider = localStorage.getItem(
          'embeddingModelProvider',
        );

        const providers = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/models`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ).then(async (res) => await res.json());

        if (
          !chatModel ||
          !chatModelProvider ||
          !embeddingModel ||
          !embeddingModelProvider
        ) {
          if (!chatModel || !chatModelProvider) {
            const chatModelProviders = providers.chatModelProviders;

            chatModelProvider = Object.keys(chatModelProviders)[0];

            if (chatModelProvider === 'custom_openai') {
              toast.error(
                'Seems like you are using the custom OpenAI provider, please open the settings and configure the API key and base URL',
              );
              setError(true);
              return;
            } else {
              chatModel = Object.keys(
                chatModelProviders[chatModelProvider],
              )[0];
              if (
                !chatModelProviders ||
                Object.keys(chatModelProviders).length === 0
              )
                return toast.error('No chat models available');
            }
          }

          if (!embeddingModel || !embeddingModelProvider) {
            const embeddingModelProviders = providers.embeddingModelProviders;

            if (
              !embeddingModelProviders ||
              Object.keys(embeddingModelProviders).length === 0
            )
              return toast.error('No embedding models available');

            embeddingModelProvider = Object.keys(embeddingModelProviders)[0];
            embeddingModel = Object.keys(
              embeddingModelProviders[embeddingModelProvider],
            )[0];
          }

          localStorage.setItem('chatModel', chatModel!);
          localStorage.setItem('chatModelProvider', chatModelProvider);
          localStorage.setItem('embeddingModel', embeddingModel!);
          localStorage.setItem(
            'embeddingModelProvider',
            embeddingModelProvider,
          );
        } else {
          const chatModelProviders = providers.chatModelProviders;
          const embeddingModelProviders = providers.embeddingModelProviders;

          if (
            Object.keys(chatModelProviders).length > 0 &&
            !chatModelProviders[chatModelProvider]
          ) {
            chatModelProvider = Object.keys(chatModelProviders)[0];
            localStorage.setItem('chatModelProvider', chatModelProvider);
          }

          if (
            chatModelProvider &&
            chatModelProvider != 'custom_openai' &&
            !chatModelProviders[chatModelProvider][chatModel]
          ) {
            chatModel = Object.keys(
              chatModelProviders[chatModelProvider],
            )[0];
            localStorage.setItem('chatModel', chatModel);
          }

          if (
            Object.keys(embeddingModelProviders).length > 0 &&
            !embeddingModelProviders[embeddingModelProvider]
          ) {
            embeddingModelProvider = Object.keys(
              embeddingModelProviders,
            )[0];
            localStorage.setItem(
              'embeddingModelProvider',
              embeddingModelProvider,
            );
          }

          if (
            embeddingModelProvider &&
            !embeddingModelProviders[embeddingModelProvider][embeddingModel]
          ) {
            embeddingModel = Object.keys(
              embeddingModelProviders[embeddingModelProvider],
            )[0];
            localStorage.setItem('embeddingModel', embeddingModel);
          }
        }

        const wsURL = new URL(url);
        const searchParams = new URLSearchParams({});

        searchParams.append('chatModel', chatModel!);
        searchParams.append('chatModelProvider', chatModelProvider);

        if (chatModelProvider === 'custom_openai') {
          searchParams.append(
            'openAIApiKey',
            localStorage.getItem('openAIApiKey')!,
          );
          searchParams.append(
            'openAIBaseURL',
            localStorage.getItem('openAIBaseURL')!,
          );
        }

        searchParams.append('embeddingModel', embeddingModel!);
        searchParams.append(
          'embeddingModelProvider',
          embeddingModelProvider,
        );

        wsURL.search = searchParams.toString();

        const ws = new WebSocket(wsURL.toString());

        const timeoutId = setTimeout(() => {
          if (ws.readyState !== 1) {
            toast.error(
              'Failed to connect to the server. Please try again later.',
            );
          }
        }, 10000);

        ws.onopen = () => {
          console.log('[DEBUG] WebSocket connection opened');
          clearTimeout(timeoutId);
          setIsWSReady(true);
        };

        ws.onerror = () => {
          clearTimeout(timeoutId);
          setError(true);
          toast.error('WebSocket connection error.');
        };

        ws.onclose = () => {
          clearTimeout(timeoutId);
          setError(true);
          console.log('[DEBUG] WebSocket connection closed');
        };

        ws.addEventListener('message', (e) => {
          const data = JSON.parse(e.data);
          if (data.type === 'error') {
            toast.error(data.data);
          }
        });

        setWs(ws);
      };

      connectWs();
    }

    return () => {
      if (ws?.readyState === 1) {
        ws?.close();
        console.log('[DEBUG] WebSocket closed');
      }
    };
  }, [ws, url, setIsWSReady, setError]);

  return ws;
};

const loadMessages = async (
  chatId: string,
  setMessages: (messages: Message[]) => void,
  setIsMessagesLoaded: (loaded: boolean) => void,
  setChatHistory: (history: [string, string][]) => void,
  setFocusMode: (mode: string) => void,
  setNotFound: (notFound: boolean) => void,
) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/chats/${chatId}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );

  if (res.status === 404) {
    setNotFound(true);
    setIsMessagesLoaded(true);
    return;
  }

  const data = await res.json();

  const messages = data.messages.map((msg: any) => {
    return {
      ...msg,
      ...JSON.parse(msg.metadata),
    };
  }) as Message[];

  setMessages(messages);

  const history = messages.map((msg) => {
    return [msg.role, msg.content];
  }) as [string, string][];

  console.log('[DEBUG] Messages loaded:', messages);

  document.title = messages[0].content;

  setChatHistory(history);
  setFocusMode(data.chat.focusMode);
  setIsMessagesLoaded(true);
};

const ChatWindow = ({ id }: { id?: string }) => {
  const searchParams = useSearchParams();
  const initialMessage = searchParams.get('q');

  const [chatId, setChatId] = useState<string | undefined>(id);
  const [newChatCreated, setNewChatCreated] = useState(false);

  const [hasError, setHasError] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const [isWSReady, setIsWSReady] = useState(false);
  const ws = useSocket(
    process.env.NEXT_PUBLIC_WS_URL!,
    setIsWSReady,
    setHasError,
  );

  const [loading, setLoading] = useState(false);
  const [messageAppeared, setMessageAppeared] = useState(false);

  const [chatHistory, setChatHistory] = useState<[string, string][]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  const [focusMode, setFocusMode] = useState('webSearch');

  const [isMessagesLoaded, setIsMessagesLoaded] = useState(false);

  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (
      chatId &&
      !newChatCreated &&
      !isMessagesLoaded &&
      messages.length === 0
    ) {
      loadMessages(
        chatId,
        setMessages,
        setIsMessagesLoaded,
        setChatHistory,
        setFocusMode,
        setNotFound,
      );
    } else if (!chatId) {
      setNewChatCreated(true);
      setIsMessagesLoaded(true);
      setChatId(crypto.randomBytes(20).toString('hex'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lastRequest = useRef<{
    signal: AbortSignal;
  } | null>(null);

  const sendMessage = async (message: string) => {
    if (ws?.readyState === 1) {
      setLoading(true);

      const messageId = crypto.randomBytes(20).toString('hex');

      const messageObj: Message = {
        messageId,
        chatId: chatId!,
        createdAt: new Date(),
        content: message,
        role: 'user',
      };

      setMessages((prevMessages) => [...prevMessages, messageObj]);

      try {
        // Send the user message through WebSocket
        ws.send(
          JSON.stringify({
            type: 'message',
            data: messageObj,
          }),
        );

        // Fetch results from the external API
        const response = await fetch(
          'https://inpharmd.ai/api/v2/search?access_token=d8549b1eba0eab87fafd383bec0c27e0',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt: message }),
          },
        );

        if (!response.ok) {
          throw new Error('Failed to fetch results from the API');
        }

        const data = await response.json();
        const results = data.results || []; // Adjust based on actual response structure

        const responseMessage: Message = {
          messageId: crypto.randomBytes(20).toString('hex'),
          chatId: chatId!,
          createdAt: new Date(),
          content: results.join('\n'), // Format the results as needed
          role: 'assistant',
        };

        setMessages((prevMessages) => [...prevMessages, responseMessage]);
        setMessageAppeared(true);
        setLoading(false);

      } catch (error) {
        console.error('Error sending message:', error);
        toast.error('Failed to send message. Please try again later.');
        setLoading(false);
      }

      if (focusMode === 'suggestions') {
        const signal = lastRequest.current?.signal;

        if (signal && signal.aborted) return;

        const controller = new AbortController();
        lastRequest.current = controller;

        const suggestions = await getSuggestions(message, controller.signal);

        if (suggestions.length > 0) {
          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              msg.messageId === messageId
                ? { ...msg, suggestions }
                : msg,
            ),
          );
        }
      }
    } else {
      toast.error('WebSocket is not connected. Please try again later.');
    }
  };

  return (
    <>
      <Navbar messages={messages} /> {/* Pass messages state to Navbar */}
      {hasError ? (
        <Error statusCode={500} />
      ) : isMessagesLoaded ? (
        messages.length > 0 ? (
          <Chat
            messages={messages}
            loading={loading}
            messageAppeared={messageAppeared}
            onSendMessage={sendMessage}
            focusMode={focusMode}
            setFocusMode={setFocusMode}
          />
        ) : (
          <EmptyChat
            loading={loading}
            initialMessage={initialMessage ?? ''}
            onSendMessage={sendMessage}
          />
        )
      ) : (
        <div>Loading...</div>
      )}
    </>
  );
};

export default ChatWindow;
