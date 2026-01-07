'use client';

import { useEffect, useState } from 'react';
import { notFound, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import Link from 'next/link';
// import ArticleSocial from '@/components/ArticleSocial'; // DISABLED - Article comments/likes removed

export default function ArticlePage({ params }: { params: { id: string } }) {
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchArticle();
  }, [params.id]);

  const fetchArticle = async () => {
    try {
      const response = await fetch('/api/articles');
      const articles = await response.json();
      const foundArticle = articles.find((a: any) => a.id === params.id);
      
      if (!foundArticle) {
        notFound();
      }
      
      setArticle(foundArticle);
    } catch (error) {
      console.error('Error fetching article:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center text-gray-600 dark:text-gray-400">Loading article...</div>
      </div>
    );
  }

  if (!article) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <Link
        href="/"
        className="inline-flex items-center space-x-2 text-mba-blue hover:text-blue-600 dark:text-blue-400 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Home</span>
      </Link>

      {/* Article Header */}
      <article className="bg-white dark:bg-gray-800 rounded-lg p-8 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="mb-6">
          <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
            {article.title}
          </h1>
          
          <div className="flex items-center space-x-4 text-gray-600 dark:text-gray-400 text-sm">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span>{article.author}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>
                {new Date(article.publishedDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
            {article.category && (
              <span className="px-3 py-1 bg-mba-blue/10 text-mba-blue rounded-full text-xs font-medium">
                {article.category}
              </span>
            )}
          </div>
        </div>

        {/* Article Image */}
        {article.image && (
          <div className="mb-6 rounded-lg overflow-hidden">
            <img
              src={article.image}
              alt={article.title}
              className="w-full h-auto object-cover"
            />
          </div>
        )}

        {/* Article Content */}
        <div className="prose prose-lg dark:prose-invert max-w-none">
          <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
            {article.content}
          </div>
        </div>

        {/* Social Features (Likes & Comments) - DISABLED */}
        {/* <ArticleSocial articleId={article.id} /> */}
      </article>
    </div>
  );
}

