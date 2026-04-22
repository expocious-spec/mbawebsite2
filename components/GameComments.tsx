'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { 
  MessageSquare, 
  Heart, 
  Reply, 
  Pin, 
  Trash2, 
  Edit,
  Send,
  X,
  AlertCircle 
} from 'lucide-react';

interface User {
  id: string;
  username: string;
  minecraft_username: string;
  minecraft_user_id: string;
  avatar_url?: string;
}

interface Comment {
  id: number;
  game_id: number;
  user_id: string;
  content: string;
  parent_comment_id: number | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  user: User;
  likeCount: number;
  likedByUser: boolean;
  replies: Comment[];
}

interface GameCommentsProps {
  gameId: string;
  isAdmin?: boolean;
}

export default function GameComments({ gameId, isAdmin = false }: GameCommentsProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionResults, setMentionResults] = useState<any[]>([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);

  useEffect(() => {
    fetchComments();
  }, [gameId]);

  // If user is logged in, they already passed Discord-Minecraft link check during auth
  // (Same as minigames - no additional check needed)
  const isLoggedIn = !!session?.user?.id;

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/games/${gameId}/comments`);
      const data = await res.json();
      setComments(data.comments || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
      setError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent, parentId: number | null = null) => {
    e.preventDefault();
    
    if (!session) {
      setError('You must be logged in to comment');
      return;
    }

    const content = parentId ? newComment : newComment;
    if (!content.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/games/${gameId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          parentCommentId: parentId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to post comment');
      }

      setNewComment('');
      setReplyingTo(null);
      await fetchComments();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId: number, currentlyLiked: boolean) => {
    if (!session) {
      setError('You must be logged in to like comments');
      return;
    }

    try {
      const method = currentlyLiked ? 'DELETE' : 'POST';
      const res = await fetch(`/api/games/${gameId}/comments/${commentId}/like`, {
        method,
      });

      if (!res.ok) throw new Error('Failed to update like');

      const data = await res.json();
      
      // Update comment in state
      setComments(prevComments => 
        prevComments.map(comment => {
          if (comment.id === commentId) {
            return {
              ...comment,
              likeCount: data.likeCount,
              likedByUser: data.likedByUser,
            };
          }
          // Update in replies
          if (comment.replies) {
            return {
              ...comment,
              replies: comment.replies.map(reply =>
                reply.id === commentId
                  ? { ...reply, likeCount: data.likeCount, likedByUser: data.likedByUser }
                  : reply
              ),
            };
          }
          return comment;
        })
      );
    } catch (error) {
      setError('Failed to update like');
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const res = await fetch(`/api/games/${gameId}/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete comment');

      await fetchComments();
    } catch (error) {
      setError('Failed to delete comment');
    }
  };

  const handlePinComment = async (commentId: number) => {
    try {
      const res = await fetch(`/api/games/${gameId}/comments/${commentId}/pin`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error('Failed to pin comment');

      await fetchComments();
    } catch (error) {
      setError('Failed to pin comment');
    }
  };

  const handleEditComment = async (commentId: number) => {
    if (!editContent.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/games/${gameId}/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent.trim() }),
      });

      if (!res.ok) throw new Error('Failed to update comment');

      setEditingComment(null);
      setEditContent('');
      await fetchComments();
    } catch (error) {
      setError('Failed to update comment');
    } finally {
      setSubmitting(false);
    }
  };

  const getMinecraftAvatarUrl = (minecraftUserId: string) => {
    return `https://mc-heads.net/avatar/${minecraftUserId}/32`;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  // Parse mentions in text and render them
  const renderTextWithMentions = (text: string) => {
    // Match @mentions (format: @username)
    const mentionRegex = /@(\w+)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      // Add mention as styled span
      parts.push(
        <span
          key={match.index}
          className="text-purple-600 dark:text-purple-400 font-semibold hover:underline cursor-pointer"
        >
          @{match[1]}
        </span>
      );
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  // Handle text change with mention detection
  const handleTextChange = async (value: string, setter: (v: string) => void) => {
    setter(value);
    
    // Detect @ mentions
    const cursorPos = value.length;
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtSymbol !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtSymbol + 1);
      // Check if there's a space after @, if so, cancel mention
      if (!textAfterAt.includes(' ') && textAfterAt.length >= 0) {
        setMentionSearch(textAfterAt);
        
        // Search for players
        if (textAfterAt.length >= 1) {
          console.log('[Mention] Searching for:', textAfterAt);
          try {
            const res = await fetch(`/api/players?search=${encodeURIComponent(textAfterAt)}`);
            const data = await res.json();
            console.log('[Mention] Results:', data);
            setMentionResults(data.slice(0, 5)); // Show top 5 results
            setShowMentionDropdown(data.length > 0);
          } catch (error) {
            console.error('[Mention] Error searching players:', error);
            setShowMentionDropdown(false);
          }
        } else {
          setMentionResults([]);
          setShowMentionDropdown(false);
        }
      } else {
        setShowMentionDropdown(false);
      }
    } else {
      setShowMentionDropdown(false);
    }
  };

  // Insert mention into text
  const insertMention = (username: string, setter: (v: string) => void, value: string) => {
    const lastAtSymbol = value.lastIndexOf('@');
    const beforeMention = value.substring(0, lastAtSymbol);
    const afterMention = value.substring(lastAtSymbol + 1 + mentionSearch.length);
    setter(`${beforeMention}@${username} ${afterMention}`);
    setShowMentionDropdown(false);
    setMentionSearch('');
    setMentionResults([]);
  };

  const renderComment = (comment: Comment, isReply: boolean = false) => {
    const isOwnComment = session?.user?.id === comment.user_id;
    const isEditing = editingComment === comment.id;

    return (
      <div
        key={comment.id}
        className={`${isReply ? 'ml-12' : ''} ${
          comment.is_pinned ? 'bg-purple-50 dark:bg-purple-900/10 border-l-4 border-purple-500' : ''
        }`}
      >
        <div className="flex gap-3 p-4">
          {/* Minecraft Avatar */}
          <div className="flex-shrink-0">
            <Image
              src={getMinecraftAvatarUrl(comment.user.minecraft_user_id)}
              alt={comment.user.minecraft_username}
              width={40}
              height={40}
              className="rounded"
            />
          </div>

          {/* Comment Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-gray-900 dark:text-white">
                {comment.user.minecraft_username}
              </span>
              <span className="text-xs text-gray-500">
                {formatTimeAgo(comment.created_at)}
              </span>
              {comment.is_pinned && (
                <Pin className="w-4 h-4 text-purple-500" fill="currentColor" />
              )}
              {comment.updated_at !== comment.created_at && (
                <span className="text-xs text-gray-400 italic">(edited)</span>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditComment(comment.id)}
                    disabled={submitting}
                    className="px-4 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingComment(null);
                      setEditContent('');
                    }}
                    className="px-4 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
                  {renderTextWithMentions(comment.content)}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-4 mt-2">
                  <button
                    onClick={() => handleLikeComment(comment.id, comment.likedByUser)}
                    disabled={!session}
                    className={`flex items-center gap-1 text-sm ${
                      comment.likedByUser
                        ? 'text-red-500'
                        : 'text-gray-500 hover:text-red-500'
                    } disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                  >
                    <Heart
                      className="w-4 h-4"
                      fill={comment.likedByUser ? 'currentColor' : 'none'}
                    />
                    {comment.likeCount > 0 && <span>{comment.likeCount}</span>}
                  </button>

                  {!isReply && (
                    <button
                      onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                      disabled={!session}
                      className="flex items-center gap-1 text-sm text-gray-500 hover:text-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Reply className="w-4 h-4" />
                      <span>Reply</span>
                    </button>
                  )}

                  {isOwnComment && !isReply && (
                    <button
                      onClick={() => {
                        setEditingComment(comment.id);
                        setEditContent(comment.content);
                      }}
                      className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-500 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                  )}

                  {isAdmin && (
                    <>
                      <button
                        onClick={() => handlePinComment(comment.id)}
                        className="flex items-center gap-1 text-sm text-gray-500 hover:text-purple-500 transition-colors"
                      >
                        <Pin className="w-4 h-4" />
                        <span>{comment.is_pinned ? 'Unpin' : 'Pin'}</span>
                      </button>
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    </>
                  )}
                </div>
              </>
            )}

            {/* Reply Form */}
            {replyingTo === comment.id && (
              <form onSubmit={(e) => handleSubmitComment(e, comment.id)} className="mt-3">
                <div className="relative">
                  <textarea
                    value={newComment}
                    onChange={(e) => handleTextChange(e.target.value, setNewComment)}
                    placeholder="Write a reply... (Use @ to mention players)"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                    rows={2}
                  />
                  {/* Mention Dropdown for Reply */}
                  {showMentionDropdown && mentionResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {mentionResults.map((player) => (
                        <button
                          key={player.id}
                          type="button"
                          onClick={() => insertMention(player.minecraftUsername || player.displayName, setNewComment, newComment)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                        >
                          <span className="font-medium text-gray-900 dark:text-white">
                            {player.minecraftUsername || player.displayName}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    type="submit"
                    disabled={submitting || !newComment.trim()}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Reply</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingTo(null);
                      setNewComment('');
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="border-l-2 border-gray-200 dark:border-gray-700">
            {comment.replies.map((reply) => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="w-6 h-6 text-purple-500" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Comments ({comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)})
        </h2>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* New Comment Form */}
      {session ? (
        <form onSubmit={(e) => handleSubmitComment(e, null)} className="mb-6">
            <div className="relative">
              <textarea
                value={newComment}
                onChange={(e) => handleTextChange(e.target.value, setNewComment)}
                placeholder="Share your thoughts about this game... (Use @ to mention players)"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={3}
              />
              {/* Mention Dropdown */}
              {showMentionDropdown && mentionResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {mentionResults.map((player) => (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => insertMention(player.minecraftUsername || player.displayName, setNewComment, newComment)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <span className="font-medium text-gray-900 dark:text-white">
                        {player.minecraftUsername || player.displayName}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={submitting || !newComment.trim()}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Post Comment
              </button>
            </div>
          </form>
      ) : (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Sign in to comment on this game.{' '}
            <a href="/api/auth/signin" className="underline hover:text-blue-600">
              Sign in
            </a>
          </p>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            No comments yet. Be the first to share your thoughts!
          </p>
        ) : (
          comments.map((comment) => renderComment(comment))
        )}
      </div>
    </div>
  );
}
