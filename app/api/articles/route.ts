import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { sendArticleToDiscord } from '@/lib/discord-webhook';

export async function GET() {
  const { data: articles, error } = await supabaseAdmin
    .from('articles')
    .select('*')
    .order('published_date', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const formattedArticles = articles?.map(article => ({
    id: article.id,
    title: article.title,
    content: article.content,
    author: article.author,
    publishedDate: article.published_date,
    image: article.cover_image,
    excerpt: article.excerpt,
    category: 'news', // Default since not in DB
    published: true, // Default since not in DB
  })) || [];

  return NextResponse.json(formattedArticles);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.title || !body.content || !body.author) {
      return NextResponse.json(
        { error: 'Title, content, and author are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('articles')
      .insert({
        title: body.title,
        content: body.content,
        author: body.author,
        published_date: new Date().toISOString(),
        cover_image: body.image || body.coverImage || null,
        excerpt: body.content.slice(0, 150),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    // Send notification to Discord
    const articleUrl = `https://minecraftbasketball.com/news/${data.id}`;
    await sendArticleToDiscord({
      title: data.title,
      content: data.content,
      author: data.author,
      publishedDate: data.published_date,
      image: data.cover_image,
      articleUrl,
      webhookChannel: body.webhookChannel,
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Article published successfully',
      article: {
        id: data.id,
        title: data.title,
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to create article' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Article ID is required' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.content !== undefined) {
      updateData.content = updates.content;
      // Auto-update excerpt from content if content is being updated
      updateData.excerpt = updates.content.slice(0, 150);
    }
    if (updates.author !== undefined) updateData.author = updates.author;
    if (updates.image !== undefined) updateData.cover_image = updates.image;
    if (updates.coverImage !== undefined) updateData.cover_image = updates.coverImage;
    if (updates.excerpt !== undefined) updateData.excerpt = updates.excerpt;
    // Ignore published and category as they're not in the database

    const { data, error } = await supabaseAdmin
      .from('articles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error || !data) {
      return NextResponse.json(
        { success: false, message: error?.message || 'Article not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Article updated successfully',
      article: { id: data.id }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to update article' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Article ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('articles')
      .delete()
      .eq('id', id);
    
    if (error) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Article deleted successfully'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete article' },
      { status: 500 }
    );
  }
}

