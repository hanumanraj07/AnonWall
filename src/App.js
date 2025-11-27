import React, { useEffect, useMemo, useState } from "react";
import "./App.css";
import { supabase } from "./supabaseClient";

const THEME_KEY = "anonWallTheme";

const REACTIONS = [
  { id: "heart", emoji: "❤️", label: "Love" },
  { id: "support", emoji: "🤝", label: "Support" },
  { id: "hug", emoji: "🤗", label: "Hug" },
  { id: "relatable", emoji: "🔥", label: "Relatable" },
  { id: "sad", emoji: "😢", label: "Felt this" },
];

const TAG_OPTIONS = [
  { value: "general", label: "General" },
  { value: "love", label: "Love & Relationships" },
  { value: "family", label: "Family" },
  { value: "school", label: "School / College" },
  { value: "work", label: "Work / Career" },
  { value: "mental", label: "Mental Health" },
  { value: "random", label: "Random Thoughts" },
];

function formatTimeAgo(timestamp) {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours < 24) return `${diffHours} hr ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

  const d = new Date(timestamp);
  return (
    d.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }) +
    " · " +
    d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    })
  );
}

function sortPosts(posts, sortType) {
  const arr = [...posts];
  switch (sortType) {
    case "oldest":
      return arr.sort((a, b) => a.createdAt - b.createdAt);
    case "top":
      return arr.sort((a, b) => {
        const score = (p) =>
          Object.values(p.reactions || {}).reduce((s, v) => s + (v || 0), 0);
        const diff = score(b) - score(a);
        if (diff !== 0) return diff;
        return b.createdAt - a.createdAt;
      });
    case "newest":
    default:
      return arr.sort((a, b) => b.createdAt - a.createdAt);
  }
}

function App() {
  const [theme, setTheme] = useState("dark");
  const [posts, setPosts] = useState([]);
  const [sort, setSort] = useState("newest");
  const [text, setText] = useState("");
  const [tag, setTag] = useState("general");
  const [loading, setLoading] = useState(false);
  const maxLength = 400;

  // Load theme from localStorage
  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem(THEME_KEY);
      if (storedTheme === "light" || storedTheme === "dark") {
        setTheme(storedTheme);
      }
    } catch (err) {
      console.error("Error loading theme from localStorage", err);
    }
  }, []);

  // Apply theme to body
  useEffect(() => {
    document.body.className = theme === "light" ? "light" : "dark";
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (err) {
      console.error("Error saving theme to localStorage", err);
    }
  }, [theme]);

  // Load posts from Supabase
  useEffect(() => {
    async function fetchPosts() {
      setLoading(true);
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading posts:", error);
        setLoading(false);
        return;
      }

      const mapped = (data || []).map((row) => ({
        id: row.id,
        text: row.text,
        tag: row.tag,
        tagLabel: row.tag_label,
        createdAt: new Date(row.created_at).getTime(),
        reactions: row.reactions || {},
      }));

      setPosts(mapped);
      setLoading(false);
    }

    fetchPosts();
  }, []);

  const sortedPosts = useMemo(() => sortPosts(posts, sort), [posts, sort]);

  const handleThemeToggle = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (trimmed.length < 5) {
      alert("Write at least a few words to share your confession.");
      return;
    }

    const tagMeta = TAG_OPTIONS.find((t) => t.value === tag) || TAG_OPTIONS[0];

    const reactions = REACTIONS.reduce((acc, r) => {
      acc[r.id] = 0;
      return acc;
    }, {});

    const { data, error } = await supabase
      .from("posts")
      .insert([
        {
          text: trimmed,
          tag: tagMeta.value,
          tag_label: tagMeta.label,
          reactions,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error saving post:", error);
      alert("Something went wrong while posting. Please try again.");
      return;
    }

    const newPost = {
      id: data.id,
      text: data.text,
      tag: data.tag,
      tagLabel: data.tag_label,
      createdAt: new Date(data.created_at).getTime(),
      reactions: data.reactions || {},
    };

    // Add new post to top of list
    setPosts((prev) => [newPost, ...prev]);
    setText("");
  };

  const handleReact = async (postId, reactionId) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const newReactions = {
      ...(post.reactions || {}),
      [reactionId]: (post.reactions?.[reactionId] || 0) + 1,
    };

    // Optimistic UI update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, reactions: newReactions } : p
      )
    );

    const { error } = await supabase
      .from("posts")
      .update({ reactions: newReactions })
      .eq("id", postId);

    if (error) {
      console.error("Error updating reactions:", error);
      // (Optional) You could revert UI here if needed
    }
  };

  const postCountLabel =
    posts.length === 0
      ? "No posts yet"
      : posts.length === 1
      ? "1 anonymous confession"
      : `${posts.length} anonymous confessions`;

  const isNearLimit = maxLength - text.length <= 30;

  return (
    <div className="app">
      <header>
        <div className="brand">
          <div className="brand-logo">
            <span>✦</span>
          </div>
          <div className="brand-text">
            <h1>AnonWall</h1>
            <p>Say anything. No names. Just support.</p>
          </div>
        </div>

        <div className="header-actions">
          <div className="pill">🔒 No sign-up • 100% anonymous</div>
          <button className="btn" type="button" onClick={handleThemeToggle}>
            <span className="icon">{theme === "dark" ? "🌙" : "☀️"}</span>
            <span className="label">{theme === "dark" ? "Dark" : "Light"}</span>
          </button>
        </div>
      </header>

      <main>
        <section className="composer">
          <div className="composer-inner">
            <div className="composer-top">
              <div>
                <h2>
                  <span className="emoji">💭</span> What’s on your mind?
                </h2>
                <div className="composer-tagline">
                  Drop a confession, a worry, or a secret. You stay anonymous.
                </div>
              </div>
              <div className="badge-hot">Live support wall</div>
            </div>

            <form onSubmit={handleSubmit}>
              <textarea
                maxLength={maxLength}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Example: I feel like I’m falling behind everyone, but I don’t know how to catch up..."
              />

              <div className="composer-footer">
                <div className="composer-left">
                  <select value={tag} onChange={(e) => setTag(e.target.value)}>
                    {TAG_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>

                  <div className="hint">
                    🧡{" "}
                    <span>
                      Be kind. Someone out there is you on a different day.
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    className={
                      "counter" + (isNearLimit ? " counter--limit" : "")
                    }
                  >
                    {text.length} / {maxLength}
                  </span>
                  <button type="submit" className="btn btn-primary">
                    <span className="icon">➜</span> Post Anonymously
                  </button>
                </div>
              </div>
            </form>
          </div>
        </section>

        <section className="controls">
          <div className="filter-group">
            <button
              className={"chip" + (sort === "newest" ? " chip--active" : "")}
              onClick={() => setSort("newest")}
            >
              <span className="dot"></span> Newest
            </button>
            <button
              className={"chip" + (sort === "top" ? " chip--active" : "")}
              onClick={() => setSort("top")}
            >
              ⭐ Top support
            </button>
            <button
              className={"chip" + (sort === "oldest" ? " chip--active" : "")}
              onClick={() => setSort("oldest")}
            >
              ⏳ Oldest
            </button>
          </div>

          <div className="meta-info">
            <span className="meta-dot"></span>
            <span>
              {loading ? "Loading posts..." : postCountLabel}
            </span>
          </div>
        </section>

        <section className="posts">
          {loading && posts.length === 0 ? (
            <div className="empty-state">
              <span>⏳</span>
              Loading anonymous confessions...
            </div>
          ) : sortedPosts.length === 0 ? (
            <div className="empty-state">
              <span>✨</span>
              No confessions yet. Be the first to share something anonymously.
            </div>
          ) : (
            sortedPosts.map((post) => (
              <article key={post.id} className="post">
                <div className="post-tag">
                  <span className="dot"></span>
                  {post.tagLabel || "General"}
                </div>
                <div className="post-text">{post.text}</div>
                <div className="post-meta">
                  <div className="post-time">
                    <span>👤 anon</span>
                    <span className="dot"></span>
                    <span>{formatTimeAgo(post.createdAt)}</span>
                  </div>
                  <div className="reactions">
                    {REACTIONS.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        className="reaction-button"
                        onClick={() => handleReact(post.id, r.id)}
                      >
                        <span className="emoji">{r.emoji}</span>
                        <span>{r.label}</span>
                        <span>{post.reactions?.[r.id] || 0}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
      </main>

      <footer>
        <div>Built for gentle anonymous sharing.</div>
        <div>Tip: Open this site later to see new reactions.</div>
      </footer>
    </div>
  );
}

export default App;
