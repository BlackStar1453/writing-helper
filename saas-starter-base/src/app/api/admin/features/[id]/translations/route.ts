import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAPI } from '@/lib/auth/admin-middleware';
import { 
  getFeatureAvailableLocales, 
  upsertFeatureTranslation, 
  deleteFeatureTranslation,
  getFeatureWithTranslation 
} from '@/lib/db/queries';

// GET - 获取功能的所有翻译
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const authResult = await verifyAdminAPI();
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    // 获取功能的所有可用语言
    const availableLocales = await getFeatureAvailableLocales(id);

    // 获取每种语言的详细内容
    const translations = await Promise.all(
      availableLocales.map(async (localeInfo) => {
        const featureWithTranslation = await getFeatureWithTranslation(
          id, 
          localeInfo.locale, 
          false
        );
        
        return {
          locale: localeInfo.locale,
          isOriginal: localeInfo.isOriginal,
          updatedAt: localeInfo.updatedAt,
          title: featureWithTranslation?.title || '',
          description: featureWithTranslation?.description || '',
          isTranslated: featureWithTranslation?.isTranslated || false
        };
      })
    );

    return NextResponse.json({
      success: true,
      featureId: id,
      translations
    });

  } catch (error) {
    console.error('获取功能翻译失败:', error);
    return NextResponse.json(
      { error: '获取功能翻译失败' },
      { status: 500 }
    );
  }
}

// POST - 创建或更新翻译
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const authResult = await verifyAdminAPI();
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const body = await request.json();
    const { locale, title, description } = body;

    // 验证参数
    if (!locale || !title || !description) {
      return NextResponse.json(
        { error: '缺少必要参数：locale, title, description' },
        { status: 400 }
      );
    }

    // 不允许创建中文翻译（中文是原始语言）
    if (locale === 'zh') {
      return NextResponse.json(
        { error: '不能为中文创建翻译，中文是原始语言，请直接编辑原始功能' },
        { status: 400 }
      );
    }

    // 创建或更新翻译
    const result = await upsertFeatureTranslation(
      id,
      locale,
      title,
      description
    );

    return NextResponse.json({
      success: true,
      message: result.isUpdate ? '翻译更新成功' : '翻译创建成功',
      isUpdate: result.isUpdate,
      translation: {
        id: result.translation.id,
        featureId: result.translation.featureId,
        locale: result.translation.locale,
        title: result.translation.title,
        description: result.translation.description,
        createdAt: result.translation.createdAt,
        updatedAt: result.translation.updatedAt
      }
    });

  } catch (error) {
    console.error('保存翻译失败:', error);
    return NextResponse.json(
      { error: '保存翻译失败' },
      { status: 500 }
    );
  }
}

// DELETE - 删除翻译
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const authResult = await verifyAdminAPI();
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const locale = searchParams.get('locale');

    if (!locale) {
      return NextResponse.json(
        { error: '缺少语言参数' },
        { status: 400 }
      );
    }

    // 不允许删除英文（原始语言）
    if (locale === 'en') {
      return NextResponse.json(
        { error: '不能删除英文原始内容' },
        { status: 400 }
      );
    }

    // 删除翻译
    const deleted = await deleteFeatureTranslation(id, locale);

    if (!deleted) {
      return NextResponse.json(
        { error: '翻译不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '翻译删除成功',
      deleted: {
        featureId: deleted.featureId,
        locale: deleted.locale
      }
    });

  } catch (error) {
    console.error('删除翻译失败:', error);
    return NextResponse.json(
      { error: '删除翻译失败' },
      { status: 500 }
    );
  }
}
