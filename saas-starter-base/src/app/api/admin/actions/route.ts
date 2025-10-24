import { NextRequest, NextResponse } from 'next/server';
import { adminMiddleware } from '@/lib/auth/admin';
import { 
  getUserActions, 
  createAction, 
  createActionsInBatch, 
  convertToClientAction,
  getActionsStats 
} from '@/lib/actions/database';
import { CreateActionRequest, ContextMode, ActionOutputRenderingFormat } from '@/lib/types/actions';
import { z } from 'zod';

// CORS 设置
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

// 创建 Action 的验证 schema
const createActionSchema = z.object({
  name: z.string().min(1, '名称不能为空').max(255, '名称过长'),
  groups: z.array(z.string()).min(1, '至少需要一个分组'),
  icon: z.string().optional(),
  rolePrompt: z.string().optional(),
  commandPrompt: z.string().optional(),
  mode: z.string().optional(),
  model: z.string().optional(),
  outputRenderingFormat: z.string().optional(),
  useBackgroundInfo: z.boolean().optional(),
  useLanguageLevelInfo: z.boolean().optional(),
  parentIds: z.array(z.number()).optional(),
  childrenIds: z.array(z.number()).optional(),
});

// 批量导入的验证 schema
const batchImportSchema = z.object({
  actions: z.array(createActionSchema).min(1, '至少需要一个 Action'),
  language: z.string().optional(),
  overwrite: z.boolean().optional().default(false),
});

/**
 * GET /api/admin/actions
 * 获取 Actions 列表
 */
export async function GET(req: NextRequest) {
  try {
    // 验证管理员权限
    const adminResult = await adminMiddleware(req);
    if (adminResult instanceof Response) {
      return adminResult;
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const isBuiltin = searchParams.get('builtin') === 'true';
    const groups = searchParams.get('groups')?.split(',').filter(Boolean) || [];
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 获取 Actions 列表
    const dbActions = await getUserActions({
      userId: isBuiltin ? undefined : userId || undefined,
      isBuiltin,
      groups,
      limit,
      offset,
    });

    // 转换为客户端格式
    const actions = dbActions.map(convertToClientAction);

    // 获取统计信息
    const stats = await getActionsStats(isBuiltin ? undefined : userId || undefined);

    return NextResponse.json({
      success: true,
      data: {
        actions,
        stats,
        pagination: {
          limit,
          offset,
          total: stats.total,
        }
      }
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('获取 Actions 列表失败:', error);
    return NextResponse.json({
      success: false,
      error: '获取 Actions 列表失败'
    }, { status: 500, headers: corsHeaders });
  }
}

/**
 * POST /api/admin/actions
 * 创建新的 Action 或批量导入
 */
export async function POST(req: NextRequest) {
  try {
    // 验证管理员权限
    const adminResult = await adminMiddleware(req);
    if (adminResult instanceof Response) {
      return adminResult;
    }

    const body = await req.json();
    const { searchParams } = new URL(req.url);
    const isBatch = searchParams.get('batch') === 'true';

    if (isBatch) {
      // 批量导入
      const validationResult = batchImportSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json({
          success: false,
          error: '数据验证失败',
          details: validationResult.error.errors
        }, { status: 400, headers: corsHeaders });
      }

      const { actions: actionsData, language, overwrite } = validationResult.data;

      // 如果是覆盖模式，先删除现有的内置 Actions
      if (overwrite) {
        // TODO: 实现删除逻辑
      }

      // 批量创建 Actions
      const newActions = await createActionsInBatch(
        actionsData.map(action => ({
          ...action,
          userId: undefined, // 内置 Actions 的 userId 为 undefined
          mode: action.mode as ContextMode,
          outputRenderingFormat: action.outputRenderingFormat as ActionOutputRenderingFormat
        }))
      );

      const clientActions = newActions.map(convertToClientAction);

      return NextResponse.json({
        success: true,
        data: {
          actions: clientActions,
          imported: newActions.length,
          language: language || 'unknown'
        },
        message: `成功导入 ${newActions.length} 个 Actions`
      }, { headers: corsHeaders });

    } else {
      // 单个创建
      const validationResult = createActionSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json({
          success: false,
          error: '数据验证失败',
          details: validationResult.error.errors
        }, { status: 400, headers: corsHeaders });
      }

      const actionData = validationResult.data;
      const newAction = await createAction({
        ...actionData,
        userId: undefined,
        mode: actionData.mode as ContextMode,
        outputRenderingFormat: actionData.outputRenderingFormat as ActionOutputRenderingFormat
      });
      const clientAction = convertToClientAction(newAction);

      return NextResponse.json({
        success: true,
        data: clientAction,
        message: 'Action 创建成功'
      }, { headers: corsHeaders });
    }

  } catch (error: any) {
    console.error('创建 Action 失败:', error);
    return NextResponse.json({
      success: false,
      error: '创建 Action 失败'
    }, { status: 500, headers: corsHeaders });
  }
}
