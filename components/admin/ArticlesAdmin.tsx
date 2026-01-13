'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, FileText, Upload, X as XIcon } from 'lucide-react';
import { uploadImage } from '@/lib/supabase-storage';
import Image from 'next/image';

export default function ArticlesAdmin() {
  const [showForm, setShowForm] = useState(false);
  const [editingArticle, setEditingArticle] = useState<any>(null);
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  // Fetch articles on mount
  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const response = await fetch('/api/articles');
      const data = await response.json();
      setArticles(data);
    } catch (error) {
      console.error('Failed to fetch articles:', error);
    }
  };

  const sortedArticles = [...articles].sort((a, b) => 
    new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
  );

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveArticle = async () => {
    if (!title || !content || !author) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      let imageUrl = editingArticle?.image || '';
      
      // Upload image if a new file was selected
      if (imageFile) {
        const uploadedUrl = await uploadImage(imageFile, 'article-images', `article-${Date.now()}`);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }

      const method = editingArticle ? 'PUT' : 'POST';
      const response = await fetch('/api/articles', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingArticle && { id: editingArticle.id }),
          title,
          content,
          author,
          image: imageUrl,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        alert(editingArticle ? 'Article updated successfully!' : 'Article created successfully!');
        await fetchArticles();
        resetForm();
      } else {
        alert('Error: ' + data.message);
      }
    } catch (error) {
      console.error('Failed to save article:', error);
      alert('Failed to save article');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteArticle = async (articleId: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return;

    try {
      const response = await fetch(`/api/articles?id=${articleId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Article deleted successfully!');
        await fetchArticles();
      } else {
        alert('Error: ' + data.message);
      }
    } catch (error) {
      console.error('Failed to delete article:', error);
      alert('Failed to delete article');
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setAuthor('');
    setImageFile(null);
    setImagePreview('');
    setShowForm(false);
    setEditingArticle(null);
  };

  const openEditForm = (article: any) => {
    setEditingArticle(article);
    setTitle(article.title);
    setContent(article.content);
    setAuthor(article.author);
    setImagePreview(article.image || '');
    setShowForm(true);
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Article Management</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Create and publish news articles for the home page
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            if (showForm) resetForm();
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-mba-blue hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>New Article</span>
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-6 p-6 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            {editingArticle ? 'Edit Article' : 'Create New Article'}
          </h3>
          
          <div className="space-y-4">
            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Article Image
              </label>
              <div className="flex items-center space-x-4">
                {imagePreview && (
                  <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-gray-300 dark:border-gray-600">
                    <Image
                      src={imagePreview}
                      alt="Article image preview"
                      fill
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview('');
                      }}
                      className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full"
                    >
                      <XIcon className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <label className="cursor-pointer px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300 transition-colors flex items-center space-x-2">
                  <Upload className="w-4 h-4" />
                  <span>{imagePreview ? 'Change Image' : 'Upload Image'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Article title"
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Author *
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Content *
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Article content..."
                rows={8}
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white resize-none"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {content.length} characters
              </p>
            </div>
          </div>

          <div className="flex space-x-3 mt-6">
            <button
              onClick={handleSaveArticle}
              disabled={loading}
              className="px-6 py-2 bg-mba-blue hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : (editingArticle ? 'Update Article' : 'Create Article')}
            </button>
            <button
              onClick={resetForm}
              className="px-6 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Articles List */}
      <div className="space-y-3">
        {sortedArticles.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No articles yet. Create your first article!
          </div>
        ) : (
          sortedArticles.map((article) => (
            <div
              key={article.id}
              className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-mba-blue dark:hover:border-mba-blue transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">{article.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                    {article.content}
                  </p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>By {article.author}</span>
                    <span>•</span>
                    <span>{new Date(article.publishedDate).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => openEditForm(article)}
                    className="p-2 text-mba-blue hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Edit article"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteArticle(article.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Delete article"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

