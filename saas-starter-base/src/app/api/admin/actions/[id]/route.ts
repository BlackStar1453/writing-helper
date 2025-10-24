import { NextRequest, NextResponse } from 'next/server';
import { adminMiddleware } from '@/lib/auth/admin';
import { 
  getActionById, 
  updateAction, 
  deleteAction, 
  convertToClientAction 
} from '@/lib/actions/database';
import { UpdateActionRequest, ContextMode, ActionOutputRenderingFormat } from '@/lib/types/actions';
import { z } from 'zod';

// CORS 设置
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, sentry-trace, baggage',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-cache'
};

// 处理 OPTIONS 请求
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// 更新 Action 的验证 schema
const updateActionSchema = z.object({
  name: z.string().min(1, '名称不能为空').max(255, '名称过长').optional(),
  groups: z.array(z.string()).min(1, '至少需要一个分组').optional(),
  icon: z.string().optional(),
  rolePrompt: z.string().optional(),
  commandPrompt: z.string().optional(),
  mode: z.nativeEnum(ContextMode).optional(),
  model: z.string().optional(),
  outputRenderingFormat: z.nativeEnum(ActionOutputRenderingFormat).optional(),
  useBackgroundInfo: z.boolean().optional(),
  useLanguageLevelInfo: z.boolean().optional(),
  parentIds: z.array(z.number()).optional(),
  childrenIds: z.array(z.number()).optional(),
  language: z.string().optional(),
});

/**
 * GET /api/admin/actions/[id]
 * 获取单个 Action
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证管理员权限
    const adminResult = await adminMiddleware(req);
    if (adminResult instanceof Response) {
      return adminResult;
    }

    const resolvedParams = await params;
    const actionId = parseInt(resolvedParams.id);
    if (isNaN(actionId)) {
      return NextResponse.json({
        success: false,
        error: '无效的 Action ID'
      }, { status: 400, headers: corsHeaders });
    }

    const dbAction = await getActionById(actionId);
    if (!dbAction) {
      return NextResponse.json({
        success: false,
        error: 'Action 不存在'
      }, { status: 404, headers: corsHeaders });
    }

    const clientAction = convertToClientAction(dbAction);

    return NextResponse.json({
      success: true,
      data: clientAction
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('获取 Action 失败:', error);
    return NextResponse.json({
      success: false,
      error: '获取 Action 失败'
    }, { status: 500, headers: corsHeaders });
  }
}

/**
 * PUT /api/admin/actions/[id]
 * 更新 Action
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证管理员权限
    const adminResult = await adminMiddleware(req);
    if (adminResult instanceof Response) {
      return adminResult;
    }

    const resolvedParams = await params;
    const actionId = parseInt(resolvedParams.id);
    if (isNaN(actionId)) {
      return NextResponse.json({
        success: false,
        error: '无效的 Action ID'
      }, { status: 400, headers: corsHeaders });
    }

    // 检查 Action 是否存在
    const existingAction = await getActionById(actionId);
    if (!existingAction) {
      return NextResponse.json({
        success: false,
        error: 'Action 不存在'
      }, { status: 404, headers: corsHeaders });
    }

    const body = await req.json();
    const validationResult = updateActionSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: '数据验证失败',
        details: validationResult.error.errors
      }, { status: 400, headers: corsHeaders });
    }

    const updateData = validationResult.data;
    const updatedAction = await updateAction(actionId, updateData);

    if (!updatedAction) {
      return NextResponse.json({
        success: false,
        error: '更新 Action 失败'
      }, { status: 500, headers: corsHeaders });
    }

    const clientAction = convertToClientAction(updatedAction);

    return NextResponse.json({
      success: true,
      data: clientAction,
      message: 'Action 更新成功'
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('更新 Action 失败:', error);
    return NextResponse.json({
      success: false,
      error: '更新 Action 失败'
    }, { status: 500, headers: corsHeaders });
  }
}

/**
 * DELETE /api/admin/actions/[id]
 * 删除 Action
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证管理员权限
    const adminResult = await adminMiddleware(req);
    if (adminResult instanceof Response) {
      return adminResult;
    }

    const resolvedParams = await params;
    const actionId = parseInt(resolvedParams.id);
    if (isNaN(actionId)) {
      return NextResponse.json({
        success: false,
        error: '无效的 Action ID'
      }, { status: 400, headers: corsHeaders });
    }

    // 检查 Action 是否存在
    const existingAction = await getActionById(actionId);
    if (!existingAction) {
      return NextResponse.json({
        success: false,
        error: 'Action 不存在'
      }, { status: 404, headers: corsHeaders });
    }

    const deletedAction = await deleteAction(actionId);

    if (!deletedAction) {
      return NextResponse.json({
        success: false,
        error: '删除 Action 失败'
      }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({
      success: true,
      message: 'Action 删除成功'
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('删除 Action 失败:', error);
    return NextResponse.json({
      success: false,
      error: '删除 Action 失败'
    }, { status: 500, headers: corsHeaders });
  }
}
