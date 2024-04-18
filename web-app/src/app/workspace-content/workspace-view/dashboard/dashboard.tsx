import React from 'react';
import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import { useRef, useLayoutEffect, useMemo } from 'react';
import { CoreValue } from '../../../../../../base/core-types/base.ts';
import { coreValueCompare } from '../../../../../../base/core-types/comparable.ts';
import { coreValueEquals } from '../../../../../../base/core-types/equals.ts';
import {
  startOfToday,
  kWeekMs,
  numberOfDaysLeftInCurrentMonth,
  kDayMs,
  startOfThisWeek,
  startOfThisMonth,
} from '../../../../../../base/date.ts';
import * as SetUtils from '../../../../../../base/set.ts';
import { DateFilter } from '../../../../../../cfds/base/scheme-types.ts';
import {
  Query,
  GroupByFunction,
} from '../../../../../../cfds/client/graph/query.ts';
import { VertexManager } from '../../../../../../cfds/client/graph/vertex-manager.ts';
import { User } from '../../../../../../cfds/client/graph/vertices/index.ts';
import {
  NoteType,
  Note,
} from '../../../../../../cfds/client/graph/vertices/note.ts';
import { Workspace } from '../../../../../../cfds/client/graph/vertices/workspace.ts';
import { Role } from '../../../../../../net/server/auth.ts';
import { H1, H4, Text } from '../../../../../../styles/components/texts.tsx';
import { makeStyles, cn } from '../../../../../../styles/css-objects/index.ts';
import { styleguide } from '../../../../../../styles/styleguide.ts';
import { GROUP_BY } from '../../../../core/cfds/react/filter.ts';
import {
  usePartialView,
  useGraphManager,
} from '../../../../core/cfds/react/graph.tsx';
import { useQuery2 } from '../../../../core/cfds/react/query.ts';
import { brandLightTheme as theme } from '../../../../../../styles/theme.tsx';

const useStyles = makeStyles({
  dashboardRoot: {
    height: '100%',
    overflowY: 'scroll',
    overflowX: 'hidden',
    margin: `0px ${styleguide.gridbase * 12}px`,
    paddingRight: styleguide.gridbase * 2,
    paddingLeft: styleguide.gridbase / 2,
  },
  valueBox: {
    backgroundColor: theme.mono.m0,
    borderRadius: styleguide.gridbase / 2,
    // boxSizing: 'border-box',
    boxShadow: `0px 0px 4px 0px rgba(151, 132, 97, 0.25)`,
  },
  topNumbersRow: {
    display: 'flex',
    // width: '100%',
    height: styleguide.gridbase * 18,
    marginBottom: styleguide.gridbase * 2,
    // marginRight: styleguide.gridbase / 2,
  },
  teamLeaderBox: {
    backgroundColor: theme.secondary.s2,
    flexGrow: 2,
  },
  teamBox: {
    backgroundColor: theme.secondary.s2,
    flexGrow: 3,
  },
  numberCell: {
    backgroundColor: theme.mono.m0,
    display: 'flex',
    justifyContent: 'center',
    textAlign: 'center',
    flexGrow: 1,
  },
  numberCellContents: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  numberCellSubtitle: {
    fontSize: 10,
    height: styleguide.gridbase * 2,
  },
  numbersBlockLayout: {
    display: 'flex',
    flexDirection: 'column',
  },
  numbersBlockTitle: {
    height: styleguide.gridbase * 3,
    width: '100%',
    padding: styleguide.gridbase,
    fontWeight: '600',
  },
  numbersBlockValues: {
    height: styleguide.gridbase * 12,
    display: 'flex',
    padding: `0px ${styleguide.gridbase}px`,
  },
  numberCellSpacer: {
    width: '2px',
  },
  graphsRow: {
    // marginRight: styleguide.gridbase / 2,
    display: 'flex',
    flexDirection: 'column',
    // contentJustify: 'space-between',
    // marginTop: styleguide.gridbase * 2,
  },
  graphsRowTitle: {
    marginTop: styleguide.gridbase * 2,
    marginBottom: styleguide.gridbase * 2,
    fontWeight: '600',
    fontSize: 15,
  },
  graphsRowTitleFirst: {
    marginBottom: styleguide.gridbase * 2,
    fontWeight: '600',
    fontSize: 15,
  },
  graphContainer: {
    // width: '100%',
    height: '100%', //styleguide.gridbase * 68,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    paddingTop: styleguide.gridbase,
  },
  graphCell: {
    height: styleguide.gridbase * 50,
    width: '100%', //styleguide.gridbase * 34,
    flexGrow: 1,
  },
  graphSpacer: {
    height: styleguide.gridbase * 2,
  },
  amChart: {
    // width: '100%',
    height: styleguide.gridbase * 50,
  },
  chartTitle: {
    textAlign: 'center',
    fontWeight: '600',
  },
  footer: {
    height: styleguide.gridbase * 4,
  },
});

function noteHasStatus(note: Note, childTagName: string): boolean {
  for (const [parent, child] of note.tags) {
    if (parent.name === 'שלב' && child.name === childTagName) {
      return true;
    }
  }
  return false;
}

function noteHasTag(note: Note, tags: string | string[]): boolean {
  if (!(tags instanceof Array)) {
    tags = [tags];
  }
  tags = tags.map((t) => t.trim().toLowerCase());
  for (const t of note.tags.values()) {
    const name = t.name && t.name.trim().toLowerCase();
    for (const lookupName of tags) {
      if (lookupName === name) {
        return true;
      }
    }
  }
  return false;
}

function isInProgress(note: Note): boolean {
  return noteHasTag(note, ['In Progress', 'בעבודה']);
}

function isOpenTask(note: Note): boolean {
  if (
    note.type !== NoteType.Task ||
    note.isChecked ||
    // !note.dueDate ||
    noteHasStatus(note, 'לשיוך')
  ) {
    return false;
  }
  return true;
}

function isOpenTaskWithDueBefore(note: Note, dueMs: number): boolean {
  if (!isOpenTask(note)) {
    return false;
  }
  const dueDate = note.dueDate;
  if (!dueDate) {
    return false;
  }
  const startOfTodayMs = startOfToday().getTime();
  return dueDate.getTime() - startOfTodayMs < dueMs;
}

function isOpenTaskNotOverdue(note: Note): boolean {
  if (!isOpenTask(note)) {
    return false;
  }
  const dueDate = note.dueDate;
  if (!dueDate) {
    return true;
  }
  const startOfTodayMs = startOfToday().getTime();
  return dueDate.getTime() - startOfTodayMs > 0;
}

function isTaskInTeamLeaderApproval(note: Note): boolean {
  return (
    isOpenTask(note) &&
    noteHasTag(note, [
      'לבדיקת ראש צוות',
      'For team lead approval',
      'לבדיקת מנהל משרד',
      'לאישור ראש צוות',
    ])
  );
}

function isTaskAssignedToTeamLeader(note: Note): boolean {
  if (!isOpenTask(note)) {
    return false;
  }
  for (const u of note.assignees) {
    if (u.getRoles().includes('ראש צוות')) {
      return true;
    }
  }
  return false;
}

function isTaskAssignedToMe(note: Note): boolean {
  if (!isOpenTask(note)) {
    return false;
  }
  const rootKey = note.graph.rootKey;
  for (const u of note.assignees) {
    if (u.key === rootKey) {
      return true;
    }
  }
  return false;
}

interface NumberCellProps {
  title: string;
  value: number;
  subtitle?: string;
}

function NumberCell({ title, value, subtitle }: NumberCellProps) {
  const styles = useStyles();
  return (
    <div className={cn(styles.numberCell, styles.valueBox)}>
      <div className={cn(styles.numberCellContents)}>
        <H1>{value}</H1>
        <Text>{title}</Text>
        <Text className={cn(styles.numberCellSubtitle)}>{subtitle || ' '}</Text>
      </div>
    </div>
  );
}

interface NumbersBlockProps {
  title: string;
  values: NumberCellProps[];
  className?: string;
}

function NumbersBlock({ title, values, className }: NumbersBlockProps) {
  const styles = useStyles();
  const numbers = [];
  for (const props of values) {
    if (numbers.length > 0) {
      numbers.push(<div className={cn(styles.numberCellSpacer)}></div>);
    }
    numbers.push(<NumberCell {...props} />);
  }
  return (
    <div className={className}>
      <div className={cn(styles.numbersBlockLayout)}>
        <H4 className={cn(styles.numbersBlockTitle)}>{title}</H4>
      </div>
      <div className={cn(styles.numbersBlockValues)}>{numbers}</div>
    </div>
  );
}

interface OverviewRowProps {
  myLateQuery: Query<Note, Note>;
  myInProgressQuery: Query<Note, Note>;
  myTeamLeaderApprovalQuery: Query<Note, Note>;
  otherLateQuery: Query<Note, Note>;
  otherInProgWithDue: Query<Note, Note>;
  otherInProgWithoutDue: Query<Note, Note>;
  otherCompletedQuery: Query<Note, Note, VertexManager<User>>;
}

function OverviewRow(props: OverviewRowProps) {
  const myLateQuery = useQuery2(props.myLateQuery);
  const myInProgressQuery = useQuery2(props.myInProgressQuery);
  const myTeamLeaderApprovalQuery = useQuery2(props.myTeamLeaderApprovalQuery);
  const otherLateQuery = useQuery2(props.otherLateQuery);
  const otherInProgWithDate = useQuery2(props.otherInProgWithDue);
  const otherInProgWithoutDate = useQuery2(props.otherInProgWithoutDue);
  const otherCompletedQuery = useQuery2(props.otherCompletedQuery);
  const styles = useStyles();
  return (
    <div key="topNumbersRow" className={cn(styles.topNumbersRow)}>
      <NumbersBlock
        key="myNumbers"
        className={cn(styles.teamLeaderBox)}
        title="My Tasks"
        values={[
          { title: 'Late', value: myLateQuery.count },
          { title: 'In Progress', value: myInProgressQuery.count },
          { title: 'For Approval', value: myTeamLeaderApprovalQuery.count },
        ]}
      />
      <div className={cn(styles.numberCellSpacer)}></div>
      <NumbersBlock
        key="otherNumbers"
        className={cn(styles.teamBox)}
        title="Other Tasks"
        values={[
          { title: 'Late', value: otherLateQuery.count },
          {
            title: 'In Progress',
            subtitle: 'With due-date',
            value: otherInProgWithDate.count,
          },
          {
            title: 'In Progress',
            subtitle: 'No due-date',
            value: otherInProgWithoutDate.count,
          },
          { title: 'Completed', value: otherCompletedQuery.count },
        ]}
      />
    </div>
  );
}

const kDatePredicates: Record<DateFilter, (n: Note) => boolean> = {
  week: (n: Note) =>
    isOpenTaskWithDueBefore(n, kWeekMs) &&
    n.dueDate !== undefined &&
    n.dueDate.getTime() >= startOfToday().getTime(),
  month: (n: Note) =>
    isOpenTaskWithDueBefore(n, numberOfDaysLeftInCurrentMonth() * kDayMs) &&
    n.dueDate !== undefined &&
    n.dueDate.getTime() >= startOfToday().getTime(),
};

function noteCompletedInDateFilter(
  n: Note,
  filter: DateFilter | undefined,
): boolean {
  if (!n.isChecked) {
    return false;
  }
  if (!n.completionDate) {
    return true;
  }
  if (typeof filter === 'undefined') {
    return true;
  }
  let startTime: number;
  switch (filter) {
    case 'week': {
      startTime = startOfThisWeek().getTime();
      break;
    }

    case 'month': {
      startTime = startOfThisMonth().getTime();
      break;
    }
  }
  return n.completionDate.getTime() > startTime;
}

interface ProjectProgressGraphProps {
  todoQuery: Query<Note, Note, VertexManager<Workspace>>;
  doneQuery: Query<Note, Note, VertexManager<Workspace>>;
}

function updateData<T extends CoreValue>(
  data: T[],
  axisData: am5.ListData<T>,
): void {
  const sharedLen = Math.min(data.length, axisData.length);
  for (let i = 0; i < sharedLen; ++i) {
    if (!coreValueEquals(axisData.getIndex(i), data[i])) {
      axisData.setIndex(i, data[i]);
    }
  }
  if (data.length > axisData.length) {
    axisData.pushAll(data.slice(sharedLen));
  }
  while (data.length < axisData.length) {
    axisData.removeIndex(axisData.length - 1);
  }
}

function ProjectProgressGraph(props: ProjectProgressGraphProps) {
  const styles = useStyles();
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<am5xy.XYChart | undefined>(undefined);
  const todoQuery = useQuery2(props.todoQuery);
  const doneQuery = useQuery2(props.doneQuery);
  const view = usePartialView('selectedWorkspaces');

  const data = Array.from(view.selectedWorkspaces)
    .sort(coreValueCompare)
    .map((ws) => {
      const done = doneQuery.group(ws.manager).length;
      const todo = todoQuery.group(ws.manager).length;
      return {
        name: ws.name,
        done: done === 0 ? undefined : done,
        todo: todo === 0 ? undefined : todo,
      };
    });

  useLayoutEffect(() => {
    if (ref.current && !chartRef.current) {
      const root = am5.Root.new(ref.current.id);

      const myTheme = am5.Theme.new(root);

      myTheme.rule('Label').setAll({
        fontFamily: "'Poppins', 'Heebo', sans-serif",
      });

      root.setThemes([am5themes_Animated.new(root), myTheme]);

      const chart = root.container.children.push(
        am5xy.XYChart.new(root, {
          panX: false,
          panY: false,
          wheelX: 'panX',
          wheelY: 'zoomX',
          layout: root.verticalLayout,
        }),
      );

      chart
        .get('colors')
        ?.set('colors', [
          am5.color(theme.primary.p9),
          am5.color(theme.primary.p6),
          am5.color(theme.supporting.V4),
          am5.color(theme.supporting.V2),
          am5.color(theme.supporting.T2),
          am5.color(theme.supporting.G1),
          am5.color(theme.supporting.B3),
          am5.color(theme.supporting.R2),
          am5.color(theme.supporting.O1),
          am5.color(theme.supporting.C1),
          am5.color(theme.secondary.s6),
        ]);

      chart.set(
        'scrollbarX',
        am5.Scrollbar.new(root, {
          orientation: 'horizontal',
        }),
      );

      const xRenderer = am5xy.AxisRendererX.new(root, {});
      const xAxis = chart.xAxes.push(
        am5xy.CategoryAxis.new(root, {
          categoryField: 'name',
          renderer: xRenderer,
          tooltip: am5.Tooltip.new(root, {}),
        }),
      );

      xRenderer.grid.template.setAll({
        location: 1,
      });
      const yAxis = chart.yAxes.push(
        am5xy.ValueAxis.new(root, {
          min: 0,
          max: 100,
          numberFormat: "#'%'",
          strictMinMax: true,
          calculateTotals: true,
          renderer: am5xy.AxisRendererY.new(root, {
            strokeOpacity: 0.1,
          }),
        }),
      );

      const legend = chart.children.push(
        am5.Legend.new(root, {
          centerX: am5.p50,
          x: am5.p50,
        }),
      );

      // deno-lint-ignore no-inner-declarations
      function makeSeries(name: string, fieldName: string) {
        let series = chart.series.push(
          am5xy.ColumnSeries.new(root, {
            name: name,
            stacked: true,
            xAxis: xAxis,
            yAxis: yAxis,
            valueYField: fieldName,
            valueYShow: 'valueYTotalPercent',
            categoryXField: 'name',
          }),
        );

        series.columns.template.setAll({
          tooltipText: `{name}, ${name}: {valueYTotalPercent.formatNumber('#.#')}%`,
          tooltipY: am5.percent(10),
        });
        series.data.setAll(data);
        series.bullets.push(function () {
          return am5.Bullet.new(root, {
            sprite: am5.Label.new(root, {
              text: "{valueYTotalPercent.formatNumber('#.#')}%",
              fill: root.interfaceColors.get('alternativeText'),
              centerY: am5.p50,
              centerX: am5.p50,
              populateText: true,
            }),
          });
        });

        legend.data.push(series);
      }

      makeSeries('Done', 'done');
      makeSeries('To Do', 'todo');
      chart.appear();
      chartRef.current = chart;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref.current]);

  if (chartRef.current) {
    const chart = chartRef.current;
    for (const yAxis of chart.yAxes) {
      updateData(data, yAxis.data as am5.ListData<CoreValue>);
    }
    for (const xAxis of chart.xAxes) {
      updateData(data, xAxis.data as am5.ListData<CoreValue>);
    }
    for (const s of chart.series) {
      updateData(data, s.data as am5.ListData<CoreValue>);
    }
  }

  return (
    <div className={cn(styles.graphContainer)}>
      <H4 className={cn(styles.chartTitle)}>Progress Per Project</H4>
      <div id="graphProjectProgress" ref={ref} className={cn(styles.amChart)} />
    </div>
  );
}

interface TodoByWorkspaceGraphProps {
  query: Query<Note, Note, VertexManager<Workspace>>;
}

function TodoByWorkspaceGraph(props: TodoByWorkspaceGraphProps) {
  const styles = useStyles();
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<am5xy.XYChart | undefined>(undefined);
  const query = useQuery2(props.query);
  const view = usePartialView('selectedWorkspaces');

  const data = Array.from(view.selectedWorkspaces)
    .sort(coreValueCompare)
    .map((ws) => {
      const value = query.group(ws.manager).length;
      return {
        name: ws.name,
        value: value === 0 ? undefined : value,
      };
    });

  useLayoutEffect(() => {
    if (ref.current && !chartRef.current) {
      const root = am5.Root.new(ref.current.id);

      const myTheme = am5.Theme.new(root);

      myTheme.rule('Label').setAll({
        fontFamily: "'Poppins', 'Heebo', sans-serif",
      });

      root.setThemes([am5themes_Animated.new(root), myTheme]);

      const chart = root.container.children.push(
        am5xy.XYChart.new(root, {
          panX: true,
          panY: true,
          wheelX: 'panX',
          wheelY: 'zoomX',
          pinchZoomX: true,
        }),
      );

      chart
        .get('colors')
        ?.set('colors', [
          am5.color(theme.primary.p9),
          am5.color(theme.primary.p6),
          am5.color(theme.supporting.V4),
          am5.color(theme.supporting.V2),
          am5.color(theme.supporting.T2),
          am5.color(theme.supporting.G1),
          am5.color(theme.supporting.B3),
          am5.color(theme.supporting.R2),
          am5.color(theme.supporting.O1),
          am5.color(theme.supporting.C1),
          am5.color(theme.secondary.s6),
        ]);

      const cursor = chart.set('cursor', am5xy.XYCursor.new(root, {}));
      cursor.lineY.set('visible', false);

      const xRenderer = am5xy.AxisRendererX.new(root, { minGridDistance: 30 });
      xRenderer.labels.template.setAll({
        rotation: -90,
        centerY: am5.p50,
        centerX: am5.p100,
        paddingRight: 15,
      });

      xRenderer.grid.template.setAll({
        location: 1,
      });
      const xAxis = chart.xAxes.push(
        am5xy.CategoryAxis.new(root, {
          maxDeviation: 0.3,
          categoryField: 'name',
          renderer: xRenderer,
          tooltip: am5.Tooltip.new(root, {}),
        }),
      );

      const yAxis = chart.yAxes.push(
        am5xy.ValueAxis.new(root, {
          maxDeviation: 0.3,
          renderer: am5xy.AxisRendererY.new(root, {
            strokeOpacity: 0.1,
          }),
        }),
      );

      const series = chart.series.push(
        am5xy.ColumnSeries.new(root, {
          name: 'Series 1',
          xAxis: xAxis,
          yAxis: yAxis,
          valueYField: 'value',
          sequencedInterpolation: true,
          categoryXField: 'name',
          tooltip: am5.Tooltip.new(root, {
            labelText: '{valueY}',
          }),
        }),
      );
      series.columns.template.setAll({
        cornerRadiusTL: 5,
        cornerRadiusTR: 5,
        strokeOpacity: 0,
      });
      series.columns.template.adapters.add('fill', function (fill, target) {
        return chart.get('colors')!.getIndex(series.columns.indexOf(target));
      });

      series.columns.template.adapters.add('stroke', function (stroke, target) {
        return chart.get('colors')!.getIndex(series.columns.indexOf(target));
      });
      xAxis.data.setAll(data);
      series.data.setAll(data);

      chartRef.current = chart;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref.current]);

  if (chartRef.current) {
    const chart = chartRef.current;
    for (const yAxis of chart.yAxes) {
      updateData(data, yAxis.data as am5.ListData<CoreValue>);
    }
    for (const xAxis of chart.xAxes) {
      updateData(data, xAxis.data as am5.ListData<CoreValue>);
    }
    for (const s of chart.series) {
      updateData(data, s.data as am5.ListData<CoreValue>);
    }
  }

  return (
    <div className={cn(styles.graphContainer)}>
      <H4 className={cn(styles.chartTitle)}>Tasks To Do Per Project</H4>
      <div id="graphTodoByWorkspace" ref={ref} className={cn(styles.amChart)} />
    </div>
  );
}

interface CompletedPerEmployeeProjectGraphProps {
  query: Query<Note, Note, VertexManager<User>>;
}

function CompletedPerEmployeeProjectGraph(
  props: CompletedPerEmployeeProjectGraphProps,
) {
  const styles = useStyles();
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<am5xy.XYChart | undefined>(undefined);
  const query = useQuery2(props.query);
  const view = usePartialView('selectedWorkspaces');

  const assignees = new Set<User>();
  for (const ws of view.selectedWorkspaces) {
    SetUtils.update(assignees, ws.users);
  }
  const data = Array.from(assignees)
    .sort(coreValueCompare)
    .map((u) => {
      const countByWorkspace = new Map<Workspace, number>();
      for (const note of query.group(u.manager)) {
        const ws = note.getVertexProxy().workspace;
        countByWorkspace.set(ws, (countByWorkspace.get(ws) || 0) + 1);
      }
      const res: Record<string, number | string> = {
        name: u.name,
      };
      for (const [ws, count] of countByWorkspace) {
        res[ws.key] = count;
      }
      return res;
    });

  useLayoutEffect(() => {
    if (ref.current && !chartRef.current) {
      const root = am5.Root.new(ref.current.id);

      const myTheme = am5.Theme.new(root);

      myTheme.rule('Grid', ['base']).setAll({
        strokeOpacity: 0.1,
      });
      myTheme.rule('Label').setAll({
        fontFamily: "'Poppins', 'Heebo', sans-serif",
      });

      root.setThemes([am5themes_Animated.new(root), myTheme]);

      const chart = root.container.children.push(
        am5xy.XYChart.new(root, {
          panX: false,
          panY: false,
          wheelX: 'panY',
          wheelY: 'zoomY',
          layout: root.verticalLayout,
        }),
      );

      chart
        .get('colors')
        ?.set('colors', [
          am5.color(theme.primary.p9),
          am5.color(theme.primary.p6),
          am5.color(theme.supporting.V4),
          am5.color(theme.supporting.V2),
          am5.color(theme.supporting.T2),
          am5.color(theme.supporting.G1),
          am5.color(theme.supporting.B3),
          am5.color(theme.supporting.R2),
          am5.color(theme.supporting.O1),
          am5.color(theme.supporting.C1),
          am5.color(theme.secondary.s6),
        ]);

      chart.set(
        'scrollbarY',
        am5.Scrollbar.new(root, {
          orientation: 'vertical',
        }),
      );

      const yRenderer = am5xy.AxisRendererY.new(root, {});
      const yAxis = chart.yAxes.push(
        am5xy.CategoryAxis.new(root, {
          categoryField: 'name',
          renderer: yRenderer,
          tooltip: am5.Tooltip.new(root, {}),
        }),
      );

      yRenderer.grid.template.setAll({
        location: 1,
      });

      yAxis.data.setAll(data);

      const xAxis = chart.xAxes.push(
        am5xy.ValueAxis.new(root, {
          min: 0,
          renderer: am5xy.AxisRendererX.new(root, {
            strokeOpacity: 0.1,
          }),
        }),
      );

      const legend = chart.children.push(
        am5.Legend.new(root, {
          centerX: am5.p50,
          x: am5.p50,
        }),
      );

      // deno-lint-ignore no-inner-declarations
      function makeSeries(name: string, fieldName: string) {
        let series = chart.series.push(
          am5xy.ColumnSeries.new(root, {
            name: name,
            stacked: true,
            xAxis: xAxis,
            yAxis: yAxis,
            baseAxis: yAxis,
            valueXField: fieldName,
            categoryYField: 'name',
          }),
        );

        series.columns.template.setAll({
          tooltipText: '{name}, {categoryY}: {valueX}',
          tooltipY: am5.percent(90),
        });
        series.data.setAll(data);
        series.bullets.push(function () {
          return am5.Bullet.new(root, {
            sprite: am5.Label.new(root, {
              text: '{valueX}',
              fill: root.interfaceColors.get('alternativeText'),
              centerY: am5.p50,
              centerX: am5.p50,
              populateText: true,
            }),
          });
        });

        legend.data.push(series);
      }

      for (const ws of view.selectedWorkspaces) {
        makeSeries(ws.name, ws.key);
      }

      chartRef.current = chart;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref.current]);

  if (chartRef.current) {
    const chart = chartRef.current;
    for (const yAxis of chart.yAxes) {
      updateData(data, yAxis.data as am5.ListData<CoreValue>);
    }
    for (const xAxis of chart.xAxes) {
      updateData(data, xAxis.data as am5.ListData<CoreValue>);
    }
    for (const s of chart.series) {
      updateData(data, s.data as am5.ListData<CoreValue>);
    }
  }

  return (
    <div className={cn(styles.graphContainer)}>
      <H4 className={cn(styles.chartTitle)}>
        Completed Tasks / Project Per Employee
      </H4>
      <div
        id="graphCompletedByAssigneeWorkspace"
        ref={ref}
        className={cn(styles.amChart)}
      />
    </div>
  );
}

interface TodoByAssigneeGraphProps {
  query: Query<Note, Note, VertexManager<User>>;
}

function TodoByAssigneeGraph(props: TodoByAssigneeGraphProps) {
  const styles = useStyles();
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<am5xy.XYChart | undefined>(undefined);
  const query = useQuery2(props.query);

  const data = query.groups().map((u) => {
    const value = query.group(u).length;
    return {
      name: (u as VertexManager<User>).getVertexProxy().name,
      value,
    };
  });

  useLayoutEffect(() => {
    if (ref.current && !chartRef.current) {
      const root = am5.Root.new(ref.current.id);

      const myTheme = am5.Theme.new(root);

      myTheme.rule('Grid', ['base']).setAll({
        strokeOpacity: 0.1,
      });
      myTheme.rule('Label').setAll({
        fontFamily: "'Poppins', 'Heebo', sans-serif",
      });

      root.setThemes([am5themes_Animated.new(root), myTheme]);

      const chart = root.container.children.push(
        am5xy.XYChart.new(root, {
          panX: false,
          panY: false,
          wheelX: 'none',
          wheelY: 'none',
        }),
      );

      chart
        .get('colors')
        ?.set('colors', [
          am5.color(theme.primary.p9),
          am5.color(theme.primary.p6),
          am5.color(theme.supporting.V4),
          am5.color(theme.supporting.V2),
          am5.color(theme.supporting.T2),
          am5.color(theme.supporting.G1),
          am5.color(theme.supporting.B3),
          am5.color(theme.supporting.R2),
          am5.color(theme.supporting.O1),
          am5.color(theme.supporting.C1),
          am5.color(theme.secondary.s6),
        ]);

      const yRenderer = am5xy.AxisRendererY.new(root, { minGridDistance: 30 });
      yRenderer.grid.template.set('location', 1);

      const yAxis = chart.yAxes.push(
        am5xy.CategoryAxis.new(root, {
          maxDeviation: 0,
          categoryField: 'name',
          renderer: yRenderer,
        }),
      );

      const xAxis = chart.xAxes.push(
        am5xy.ValueAxis.new(root, {
          maxDeviation: 0,
          min: 0,
          renderer: am5xy.AxisRendererX.new(root, {
            visible: true,
            strokeOpacity: 0.1,
          }),
        }),
      );

      const series = chart.series.push(
        am5xy.ColumnSeries.new(root, {
          name: 'Series 1',
          xAxis: xAxis,
          yAxis: yAxis,
          valueXField: 'value',
          sequencedInterpolation: true,
          categoryYField: 'name',
        }),
      );

      // const columnTemplate = series.columns.template;

      // columnTemplate.setAll({
      //   draggable: true,
      //   cursorOverStyle: 'pointer',
      //   tooltipText: 'drag to rearrange',
      //   cornerRadiusBR: 10,
      //   cornerRadiusTR: 10,
      //   strokeOpacity: 0,
      // });
      // columnTemplate.adapters.add('fill', (fill, target) => {
      //   return chart.get('colors').getIndex(series.columns.indexOf(target));
      // });

      // columnTemplate.adapters.add('stroke', (stroke, target) => {
      //   return chart.get('colors').getIndex(series.columns.indexOf(target));
      // });

      // columnTemplate.events.on('dragstop', () => {
      //   sortCategoryAxis();
      // });

      // function getSeriesItem(category) {
      //   for (var i = 0; i < series.dataItems.length; i++) {
      //     let dataItem = series.dataItems[i];
      //     if (dataItem.get('categoryY') == category) {
      //       return dataItem;
      //     }
      //   }
      // }

      // // Axis sorting
      // function sortCategoryAxis() {
      //   // Sort by value
      //   series.dataItems.sort(function (x, y) {
      //     return y.get('graphics').y() - x.get('graphics').y();
      //   });

      //   let easing = am5.ease.out(am5.ease.cubic);

      //   // Go through each axis item
      //   am5.array.each(yAxis.dataItems, function (dataItem) {
      //     // get corresponding series item
      //     let seriesDataItem = getSeriesItem(dataItem.get('category'));

      //     if (seriesDataItem) {
      //       // get index of series data item
      //       let index = series.dataItems.indexOf(seriesDataItem);

      //       let column = seriesDataItem.get('graphics');

      //       // position after sorting
      //       let fy =
      //         yRenderer.positionToCoordinate(yAxis.indexToPosition(index)) -
      //         column.height() / 2;

      //       // set index to be the same as series data item index
      //       if (index !== dataItem.get('index')) {
      //         dataItem.set('index', index);

      //         // current position
      //         let x = column.x();
      //         let y = column.y();

      //         column.set('dy', -(fy - y));
      //         column.set('dx', x);

      //         column.animate({
      //           key: 'dy',
      //           to: 0,
      //           duration: 600,
      //           easing: easing,
      //         });
      //         column.animate({
      //           key: 'dx',
      //           to: 0,
      //           duration: 600,
      //           easing: easing,
      //         });
      //       } else {
      //         column.animate({
      //           key: 'y',
      //           to: fy,
      //           duration: 600,
      //           easing: easing,
      //         });
      //         column.animate({
      //           key: 'x',
      //           to: 0,
      //           duration: 600,
      //           easing: easing,
      //         });
      //       }
      //     }
      //   });

      //   // Sort axis items by index.
      //   // This changes the order instantly, but as dx and dy is set and animated,
      //   // they keep in the same places and then animate to true positions.
      //   yAxis.dataItems.sort(function (x, y) {
      //     return x.get('index') - y.get('index');
      //   });
      // }

      yAxis.data.setAll(data);
      series.data.setAll(data);

      series.bullets.push(function () {
        return am5.Bullet.new(root, {
          sprite: am5.Label.new(root, {
            text: '{valueX}',
            fill: root.interfaceColors.get('alternativeText'),
            centerY: am5.p50,
            centerX: am5.p50,
            populateText: true,
          }),
        });
      });

      // series.appear();
      // chart.appear(1000, 100);

      chartRef.current = chart;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref.current]);

  if (chartRef.current) {
    const chart = chartRef.current;
    for (const yAxis of chart.yAxes) {
      updateData(data, yAxis.data as am5.ListData<CoreValue>);
    }
    for (const xAxis of chart.xAxes) {
      updateData(data, xAxis.data as am5.ListData<CoreValue>);
    }
    for (const s of chart.series) {
      updateData(data, s.data as am5.ListData<CoreValue>);
    }
  }

  return (
    <div className={cn(styles.graphContainer)}>
      <H4 className={cn(styles.chartTitle)}>Tasks To Do Per Employee</H4>
      <div id="graphTodoByAssignee" ref={ref} className={cn(styles.amChart)} />
    </div>
  );
}

function timeFrameFromDateFilter(filter: DateFilter | undefined): number {
  if (!filter) {
    return Number.MAX_SAFE_INTEGER;
  }
  switch (filter) {
    case 'week':
      return kWeekMs;

    case 'month':
      return numberOfDaysLeftInCurrentMonth() * kDayMs;
  }
}

export function Dashboard() {
  const styles = useStyles();
  const view = usePartialView('selectedWorkspaces', 'dateFilter');
  const graph = useGraphManager();
  const myLateQuery = useMemo(
    () =>
      new Query<Note, Note>({
        source: graph.sharedQueriesManager.noteQuery(),
        predicate: (note) =>
          note.type === NoteType.Task &&
          view.selectedWorkspaces.has(note.workspace) &&
          isOpenTaskWithDueBefore(note, 0) &&
          isTaskAssignedToMe(note),
        name: 'Dashboard/TeamLeaderLate',
      }),
    [graph, view.selectedWorkspaces],
  );
  const myInProgressQuery = useMemo(
    () =>
      new Query<Note, Note>({
        source: graph.sharedQueriesManager.noteQuery(),
        predicate: (note) =>
          note.type === NoteType.Task &&
          view.selectedWorkspaces.has(note.workspace) &&
          isOpenTaskNotOverdue(note) &&
          isTaskAssignedToMe(note) &&
          isInProgress(note),
        name: 'Dashboard/TeamLeaderLate',
      }),
    [graph, view.selectedWorkspaces],
  );
  const myTeamLeaderApprovalQuery = useMemo(
    () =>
      new Query<Note, Note>({
        source: graph.sharedQueriesManager.noteQuery(),
        predicate: (note) =>
          note.type === NoteType.Task &&
          view.selectedWorkspaces.has(note.workspace) &&
          isTaskInTeamLeaderApproval(note) &&
          isTaskAssignedToMe(note),
        name: 'Dashboard/TeamLeaderApproval',
      }),
    [graph, view.selectedWorkspaces],
  );
  const otherLateQuery = useMemo(
    () =>
      new Query<Note, Note>({
        source: graph.sharedQueriesManager.noteQuery(),
        predicate: (note) =>
          note.type === NoteType.Task &&
          view.selectedWorkspaces.has(note.workspace) &&
          isOpenTaskWithDueBefore(note, 0) &&
          !isTaskAssignedToMe(note),
        name: 'Dashboard/TeamLate',
      }),
    [graph, view.selectedWorkspaces],
  );
  const otherInProgressWithDue = useMemo(
    () =>
      new Query<Note, Note>({
        source: graph.sharedQueriesManager.noteQuery(),
        predicate: (note) =>
          note.type === NoteType.Task &&
          view.selectedWorkspaces.has(note.workspace) &&
          !isTaskAssignedToMe(note) &&
          isInProgress(note) &&
          note.dueDate !== undefined &&
          isOpenTaskNotOverdue(note),
        name: 'Dashboard/TeamTodo',
      }),
    [graph, view.selectedWorkspaces, view.dateFilter],
  );
  const otherInProgressNoDue = useMemo(
    () =>
      new Query<Note, Note>({
        source: graph.sharedQueriesManager.noteQuery(),
        predicate: (note) =>
          note.type === NoteType.Task &&
          view.selectedWorkspaces.has(note.workspace) &&
          !isTaskAssignedToMe(note) &&
          isInProgress(note) &&
          !note.dueDate,
        name: 'Dashboard/TeamTodo',
      }),
    [graph, view.selectedWorkspaces, view.dateFilter],
  );
  const uncheckedByWorkspace = useMemo(
    () =>
      new Query<Note, Note, VertexManager<Workspace>>({
        source: graph.sharedQueriesManager.noteQuery(),
        predicate: (note) =>
          note.type === NoteType.Task &&
          view.selectedWorkspaces.has(note.workspace) &&
          !note.isChecked,
        name: 'Dashboard/UncheckedByWorkspace',
        groupBy: GROUP_BY.workspace as GroupByFunction<
          Note,
          VertexManager<Workspace>
        >,
      }),
    [graph, view.selectedWorkspaces],
  );
  const doneByWorkspace = useMemo(
    () =>
      new Query<Note, Note, VertexManager<Workspace>>({
        source: graph.sharedQueriesManager.noteQuery(),
        predicate: (note) =>
          note.type === NoteType.Task &&
          view.selectedWorkspaces.has(note.workspace) &&
          note.isChecked,
        name: 'Dashboard/TodoByWorkspace',
        groupBy: GROUP_BY.workspace as GroupByFunction<
          Note,
          VertexManager<Workspace>
        >,
      }),
    [graph, view.selectedWorkspaces],
  );
  const teamCompletedQuery = useMemo(
    () =>
      new Query<Note, Note, VertexManager<User>>({
        source: graph.sharedQueriesManager.noteQuery(),
        predicate: (note) =>
          note.type === NoteType.Task &&
          view.selectedWorkspaces.has(note.workspace) &&
          noteCompletedInDateFilter(note, view.dateFilter),
        name: 'Dashboard/TeamCompleted',
      }),
    [graph, view.selectedWorkspaces, view.dateFilter],
  );

  const todoByWorkspace = useMemo(
    () =>
      new Query<Note, Note, VertexManager<Workspace>>({
        source: graph.sharedQueriesManager.noteQuery(),
        predicate: (note) =>
          note.type === NoteType.Task &&
          view.selectedWorkspaces.has(note.workspace) &&
          isOpenTaskWithDueBefore(
            note,
            timeFrameFromDateFilter(view.dateFilter),
          ) &&
          note.dueDate !== undefined &&
          note.dueDate.getTime() >= startOfToday().getTime() &&
          !isTaskAssignedToMe(note),
        name: 'Dashboard/TodoByWorkspace',
        groupBy: GROUP_BY.workspace as GroupByFunction<
          Note,
          VertexManager<Workspace>
        >,
      }),
    [graph, view.selectedWorkspaces, view.dateFilter],
  );

  const doneByAssignee = useMemo(
    () =>
      new Query<Note, Note, VertexManager<User>>({
        source: graph.sharedQueriesManager.noteQuery(),
        predicate: (note) =>
          note.type === NoteType.Task &&
          view.selectedWorkspaces.has(note.workspace) &&
          // note.assignees.size > 0 &&
          noteCompletedInDateFilter(note, view.dateFilter),
        name: 'Dashboard/DoneByAssignee',
        groupBy: GROUP_BY.assignee as GroupByFunction<
          Note,
          VertexManager<User>
        >,
      }),
    [graph, view.selectedWorkspaces, view.dateFilter],
  );

  const todoByAssignee = useMemo(
    () =>
      new Query<Note, Note, VertexManager<User>>({
        source: graph.sharedQueriesManager.noteQuery(),
        predicate: (note) =>
          note.type === NoteType.Task &&
          view.selectedWorkspaces.has(note.workspace) &&
          note.assignees.size > 0 &&
          isOpenTaskWithDueBefore(
            note,
            timeFrameFromDateFilter(view.dateFilter),
          ) &&
          note.dueDate !== undefined &&
          note.dueDate.getTime() >= startOfToday().getTime(),
        name: 'Dashboard/TodoByAssignee',
        groupBy: GROUP_BY.assignee as GroupByFunction<
          Note,
          VertexManager<User>
        >,
      }),
    [graph, view.selectedWorkspaces, view.dateFilter],
  );

  return (
    <div key="dashboardRoot" className={cn(styles.dashboardRoot)}>
      <div className={cn(styles.graphsRowTitleFirst)}>Tasks Status</div>
      <OverviewRow
        myLateQuery={myLateQuery}
        myInProgressQuery={myInProgressQuery}
        myTeamLeaderApprovalQuery={myTeamLeaderApprovalQuery}
        otherLateQuery={otherLateQuery}
        otherInProgWithDue={otherInProgressWithDue}
        otherInProgWithoutDue={otherInProgressNoDue}
        otherCompletedQuery={teamCompletedQuery}
      />
      {/* <div className={cn(styles.graphsRowTitle)}>Per Project</div> */}
      <div className={cn(styles.graphsRow)}>
        <div className={cn(styles.graphCell, styles.valueBox)}>
          <ProjectProgressGraph
            todoQuery={uncheckedByWorkspace}
            doneQuery={doneByWorkspace}
          />
        </div>
        <div className={cn(styles.graphSpacer)}></div>
        <div className={cn(styles.graphCell, styles.valueBox)}>
          <TodoByWorkspaceGraph query={todoByWorkspace} />
        </div>
      </div>
      <div className={cn(styles.graphSpacer)}></div>
      {/* <div className={cn(styles.graphsRowTitle)}>Per Employee</div> */}
      <div className={cn(styles.graphsRow)}>
        <div className={cn(styles.graphCell, styles.valueBox)}>
          <CompletedPerEmployeeProjectGraph query={doneByAssignee} />
        </div>
        <div className={cn(styles.graphSpacer)}></div>
        <div className={cn(styles.graphCell, styles.valueBox)}>
          <TodoByAssigneeGraph query={todoByAssignee} />
        </div>
      </div>
      <div className={cn(styles.footer)}></div>
    </div>
  );
}
