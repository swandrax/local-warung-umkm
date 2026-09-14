<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '../api';

  let isOpen = false;
  let inputMessage = '';
  let isLoading = false;
  let messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    thinking?: string;
    action?: any;
    time: string;
  }> = [
    {
      role: 'assistant',
      content: 'Halo! Saya Asisten AI Warung UMKM bertenaga Groq LPU. Ada yang bisa saya bantu terkait produk, rekomendasi warung lokal, atau integrasi API proyek?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ];

  let chatContainer: HTMLElement;

  function scrollToBottom() {
    setTimeout(() => {
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 50);
  }

  async function handleSendMessage(customText?: string) {
    const text = (customText || inputMessage).trim();
    if (!text || isLoading) return;

    inputMessage = '';
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    messages = [
      ...messages,
      { role: 'user', content: text, time: now },
    ];
    isLoading = true;
    scrollToBottom();

    try {
      // Send to active backend chat route
      const res = await api.post('/chat', {
        tenantId: 'mitra_kopi_madura_01', // Default demo warung
        message: text,
      });

      if (res.success && res.data) {
        messages = [
          ...messages,
          {
            role: 'assistant',
            content: res.data.message,
            thinking: res.data.thinking,
            action: res.data.action,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ];
      } else {
        throw new Error(res.error?.message || 'Gagal memproses pesan');
      }
    } catch (err: any) {
      messages = [
        ...messages,
        {
          role: 'assistant',
          content: `Maaf, terjadi kendala saat menghubungi AI: ${err.message || 'Koneksi gagal'}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ];
    } finally {
      isLoading = false;
      scrollToBottom();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }
</script>

<!-- Floating Launcher Button -->
<div class="chat-widget-wrapper">
  {#if !isOpen}
    <button class="chat-launcher" on:click={() => { isOpen = true; scrollToBottom(); }} aria-label="Buka Chat AI">
      <span class="launcher-icon">✨</span>
      <span class="launcher-text">Tanya AI Warung</span>
      <span class="live-dot"></span>
    </button>
  {/if}

  <!-- Chat Window Modal -->
  {#if isOpen}
    <div class="chat-window">
      <div class="chat-header">
        <div class="header-left">
          <div class="avatar-badge">🤖</div>
          <div>
            <h3 class="header-title">Asisten AI Warung UMKM</h3>
            <span class="header-sub">Groq LPU • Penalaran Kognitif Live</span>
          </div>
        </div>
        <button class="close-btn" on:click={() => (isOpen = false)} aria-label="Tutup Chat">✕</button>
      </div>

      <!-- Messages Body -->
      <div class="chat-messages" bind:this={chatContainer}>
        {#each messages as msg}
          <div class={`message-row ${msg.role}`}>
            <div class="message-bubble">
              {#if msg.thinking}
                <details class="thinking-accordion">
                  <summary class="thinking-summary">
                    <span class="brain-icon">🧠</span> Alur Penalaran AI (Thinking)
                  </summary>
                  <p class="thinking-text">{msg.thinking}</p>
                </details>
              {/if}

              <div class="message-text">{msg.content}</div>

              {#if msg.action && msg.action.type === 'SHOW_PRODUCTS' && msg.action.payload?.products}
                <div class="action-products">
                  {#each msg.action.payload.products as p}
                    <div class="product-chip">
                      <span class="prod-name">🛍️ {p.name}</span>
                      <span class="prod-price">Rp {p.price?.toLocaleString('id-ID')}</span>
                    </div>
                  {/each}
                </div>
              {/if}

              <span class="message-time">{msg.time}</span>
            </div>
          </div>
        {/each}

        {#if isLoading}
          <div class="message-row assistant">
            <div class="message-bubble loading-bubble">
              <div class="typing-indicator">
                <span></span><span></span><span></span>
              </div>
              <span class="loading-label">Sedang menalar dengan Groq...</span>
            </div>
          </div>
        {/if}
      </div>

      <!-- Quick Suggestion Chips -->
      <div class="quick-suggestions">
        <button on:click={() => handleSendMessage('Menu kopi dan roti bakar terlaris apa saja?')}>☕ Menu Kopi</button>
        <button on:click={() => handleSendMessage('Buka jam berapa warung ini?')}>⏰ Jam Buka</button>
        <button on:click={() => handleSendMessage('Bagaimana cara mendaftar jadi mitra warung?')}>🏪 Buka Toko</button>
      </div>

      <!-- Input Area -->
      <div class="chat-input-area">
        <textarea
          placeholder="Ketik pertanyaan untuk AI..."
          bind:value={inputMessage}
          on:keydown={handleKeydown}
          rows="1"
        ></textarea>
        <button
          class="send-btn"
          disabled={isLoading || !inputMessage.trim()}
          on:click={() => handleSendMessage()}
          aria-label="Kirim Pesan"
        >
          ➤
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .chat-widget-wrapper {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    z-index: 9999;
    font-family: inherit;
  }

  .chat-launcher {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    background: linear-gradient(135deg, #2563eb, #7c3aed);
    color: white;
    border: none;
    padding: 0.85rem 1.4rem;
    border-radius: 9999px;
    font-weight: 600;
    font-size: 0.95rem;
    box-shadow: 0 10px 25px -5px rgba(37, 99, 235, 0.5), 0 8px 10px -6px rgba(124, 58, 237, 0.4);
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .chat-launcher:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px -5px rgba(37, 99, 235, 0.6);
  }

  .live-dot {
    width: 8px;
    height: 8px;
    background-color: #10b981;
    border-radius: 50%;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0% { transform: scale(0.95); opacity: 0.8; }
    50% { transform: scale(1.3); opacity: 1; }
    100% { transform: scale(0.95); opacity: 0.8; }
  }

  .chat-window {
    width: 380px;
    max-width: calc(100vw - 2rem);
    height: 540px;
    max-height: calc(100vh - 4rem);
    background: #ffffff;
    border-radius: 1.25rem;
    box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.08);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px) scale(0.96); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  .chat-header {
    background: linear-gradient(135deg, #1e293b, #0f172a);
    color: white;
    padding: 1rem 1.25rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .avatar-badge {
    width: 36px;
    height: 36px;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
  }

  .header-title {
    font-size: 0.95rem;
    font-weight: 700;
    margin: 0;
    color: white;
  }

  .header-sub {
    font-size: 0.72rem;
    color: #94a3b8;
  }

  .close-btn {
    background: none;
    border: none;
    color: #94a3b8;
    font-size: 1.2rem;
    cursor: pointer;
    padding: 0.25rem;
  }

  .close-btn:hover {
    color: white;
  }

  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    background: #f8fafc;
  }

  .message-row {
    display: flex;
    width: 100%;
  }

  .message-row.user {
    justify-content: flex-end;
  }

  .message-row.assistant {
    justify-content: flex-start;
  }

  .message-bubble {
    max-width: 85%;
    padding: 0.75rem 1rem;
    border-radius: 1rem;
    font-size: 0.875rem;
    line-height: 1.45;
  }

  .message-row.user .message-bubble {
    background: #2563eb;
    color: white;
    border-bottom-right-radius: 0.25rem;
  }

  .message-row.assistant .message-bubble {
    background: white;
    color: #1e293b;
    border-bottom-left-radius: 0.25rem;
    border: 1px solid #e2e8f0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
  }

  .thinking-accordion {
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    padding: 0.4rem 0.6rem;
    margin-bottom: 0.5rem;
    font-size: 0.78rem;
  }

  .thinking-summary {
    cursor: pointer;
    font-weight: 600;
    color: #475569;
  }

  .thinking-text {
    margin-top: 0.4rem;
    color: #64748b;
    font-style: italic;
    white-space: pre-wrap;
  }

  .message-time {
    display: block;
    font-size: 0.65rem;
    margin-top: 0.35rem;
    text-align: right;
    opacity: 0.7;
  }

  .action-products {
    margin-top: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .product-chip {
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 0.4rem;
    padding: 0.4rem 0.6rem;
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
  }

  .quick-suggestions {
    display: flex;
    gap: 0.4rem;
    padding: 0.5rem 0.75rem;
    background: #ffffff;
    border-top: 1px solid #f1f5f9;
    overflow-x: auto;
  }

  .quick-suggestions button {
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    padding: 0.3rem 0.6rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    white-space: nowrap;
    cursor: pointer;
    color: #334155;
    transition: background 0.15s;
  }

  .quick-suggestions button:hover {
    background: #e2e8f0;
  }

  .chat-input-area {
    padding: 0.75rem;
    background: white;
    border-top: 1px solid #e2e8f0;
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .chat-input-area textarea {
    flex: 1;
    border: 1px solid #cbd5e1;
    border-radius: 0.75rem;
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    resize: none;
    outline: none;
  }

  .chat-input-area textarea:focus {
    border-color: #2563eb;
  }

  .send-btn {
    background: #2563eb;
    color: white;
    border: none;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .send-btn:disabled {
    background: #94a3b8;
    cursor: not-allowed;
  }

  .typing-indicator {
    display: inline-flex;
    gap: 4px;
    margin-right: 0.5rem;
  }

  .typing-indicator span {
    width: 6px;
    height: 6px;
    background: #64748b;
    border-radius: 50%;
    animation: bounce 1.4s infinite ease-in-out;
  }

  .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
  .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

  @keyframes bounce {
    0%, 80%, 100% { transform: scale(0); }
    40% { transform: scale(1); }
  }

  .loading-label {
    font-size: 0.75rem;
    color: #64748b;
  }
</style>
