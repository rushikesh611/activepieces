import { useQuery } from '@tanstack/react-query';
import { t } from 'i18next';
import { Folder, Key, Link2, Logs, Users, Workflow } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import LockedFeatureGuard from '@/app/components/locked-feature-guard';
import {
  CURSOR_QUERY_PARAM,
  DataTable,
  LIMIT_QUERY_PARAM,
} from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table/data-table-column-header';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { auditEventsApi } from '@/features/platform-admin-panel/lib/audit-events-api';
import { platformHooks } from '@/hooks/platform-hooks';
import { formatUtils } from '@/lib/utils';
import {
  ApplicationEvent,
  ApplicationEventName,
  summarizeApplicationEvent,
} from '@activepieces/ee-shared';
import { isNil } from '@activepieces/shared';

import { TableTitle } from '../../../../components/ui/table-title';

export default function AuditLogsPage() {
  const { platform } = platformHooks.useCurrentPlatform();
  const [searchParams] = useSearchParams();

  const { data: auditLogsData, isLoading } = useQuery({
    queryKey: ['audit-logs', searchParams.toString()],
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      const cursor = searchParams.get(CURSOR_QUERY_PARAM);
      const limit = searchParams.get(LIMIT_QUERY_PARAM);

      return auditEventsApi.list({
        cursor: cursor ?? undefined,
        limit: limit ? parseInt(limit) : undefined,
      });
    },
  });

  const isEnabled = platform.auditLogEnabled;
  return (
    <LockedFeatureGuard
      featureKey="AUDIT_LOGS"
      locked={!isEnabled}
      lockTitle={t('Unlock Audit Logs')}
      lockDescription={t(
        'Comply with internal and external security policies by tracking activities done within your account',
      )}
    >
      <div className="flex flex-col  w-full">
        <TableTitle>{t('Audit Logs')}</TableTitle>
        <DataTable
          columns={[
            {
              accessorKey: 'resource',
              header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Resource')} />
              ),
              cell: ({ row }) => {
                const icon = convertToIcon(row.original);
                if (isNil(icon?.icon)) {
                  return <div className="text-left"></div>;
                }
                return (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-left flex items-center gap-2">
                        {icon.icon} {icon.tooltip}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      {icon.tooltip}
                    </TooltipContent>
                  </Tooltip>
                );
              },
            },
            {
              accessorKey: 'details',
              header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Details')} />
              ),
              cell: ({ row }) => {
                return (
                  <div className="text-left">
                    {convertToDetails(row.original)}
                  </div>
                );
              },
            },
            {
              accessorKey: 'performedBy',
              header: ({ column }) => (
                <DataTableColumnHeader
                  column={column}
                  title={t('Performed By')}
                />
              ),
              cell: ({ row }) => {
                return (
                  <div className="text-left">{row.original.userEmail}</div>
                );
              },
            },
            {
              accessorKey: 'tasks',
              header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Action')} />
              ),
              cell: ({ row }) => {
                return (
                  <div className="text-left">
                    {convertToReadableString(row.original.action)}
                  </div>
                );
              },
            },
            {
              accessorKey: 'projectDisplayName',
              header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Project')} />
              ),
              cell: ({ row }) => {
                return 'project' in row.original.data ? (
                  <div className="text-left">
                    {row.original.data.project?.displayName}
                  </div>
                ) : (
                  <div className="text-left">{t('N/A')}</div>
                );
              },
            },
            {
              accessorKey: 'created',
              header: ({ column }) => (
                <DataTableColumnHeader column={column} title={t('Created')} />
              ),
              cell: ({ row }) => {
                return (
                  <div className="text-left">
                    {formatUtils.formatDate(new Date(row.original.created))}
                  </div>
                );
              },
            },
          ]}
          page={auditLogsData}
          isLoading={isLoading}
        />
      </div>
    </LockedFeatureGuard>
  );
}

const convertToReadableString = (input: string): string => {
  return input
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());
};

function convertToIcon(event: ApplicationEvent) {
  switch (event.action) {
    case ApplicationEventName.FLOW_RUN_FINISHED:
    case ApplicationEventName.FLOW_RUN_STARTED:
      return {
        icon: <Logs className="size-4" />,
        tooltip: t('Flow Run'),
      };
    case ApplicationEventName.FLOW_CREATED:
    case ApplicationEventName.FLOW_DELETED:
    case ApplicationEventName.FLOW_UPDATED:
      return {
        icon: <Workflow className="size-4" />,
        tooltip: t('Flow'),
      };
    case ApplicationEventName.FOLDER_CREATED:
    case ApplicationEventName.FOLDER_DELETED:
    case ApplicationEventName.FOLDER_UPDATED:
      return {
        icon: <Folder className="size-4" />,
        tooltip: t('Folder'),
      };
    case ApplicationEventName.CONNECTION_DELETED:
    case ApplicationEventName.CONNECTION_UPSERTED:
      return {
        icon: <Link2 className="size-4" />,
        tooltip: t('Connection'),
      };
    case ApplicationEventName.USER_SIGNED_UP:
    case ApplicationEventName.USER_SIGNED_IN:
    case ApplicationEventName.USER_PASSWORD_RESET:
    case ApplicationEventName.USER_EMAIL_VERIFIED:
      return {
        icon: <Users className="size-4" />,
        tooltip: t('User'),
      };
    case ApplicationEventName.SIGNING_KEY_CREATED:
      return {
        icon: <Key className="size-4" />,
        tooltip: t('Signing Key'),
      };
    default:
      return undefined;
  }
}

const convertToDetails = summarizeApplicationEvent;
