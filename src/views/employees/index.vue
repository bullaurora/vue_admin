<template>
  <div class="dashboard-container">
    <div class="app-container">
      <page-tools :show-before="true">
        <span slot="before">共{{ page.total }}条记录</span>
        <template slot="after">
          <el-button size="small" type="warning" @click="$router.push('/import?type=user')">导入</el-button>
          <el-button size="small" type="danger" @click="exportData">导出</el-button>
          <el-button icon="plus" type="primary" size="small" @click="showDialog = true">新增员工</el-button>
        </template>
      </page-tools>
      <!-- 放置表格和分页 -->
      <el-card v-loading="loading">
        <el-table border :data="list">
          <el-table-column label="序号" sortable="" type="index" />
          <el-table-column label="姓名" sortable="" prop="username" />
          <el-table-column label="工号" sortable="" prop="workNumber" />
          <el-table-column
            label="聘用形式"
            sortable=""
            prop="formOfEmployment"
            :formatter="formatEmployment"
          />
          <el-table-column label="部门" sortable="" prop="departmentName" />
          <el-table-column label="入职时间" sortable="" prop="timeOfEntry">
            <template slot-scope="obj">
              {{ obj.row.timeOfEntry | formatDate }}
            </template>
          </el-table-column>
          <el-table-column
            label="账户状态"
            align="center"
            sortable=""
            prop="enableState"
          >
            <template slot-scope="{ row }">
              <!-- 根据当前状态来确定 是否打开开关 -->
              <el-switch :value="row.enableState === 1" />
            </template>
          </el-table-column>
          <el-table-column label="操作" sortable="" fixed="right" width="280">
            <template slot-scope="{ row }">
              <el-button type="text" size="small" @click="$router.push(`/employees/detail/${row.id}`)">查看</el-button>
              <el-button type="text" size="small">转正</el-button>
              <el-button type="text" size="small">调岗</el-button>
              <el-button type="text" size="small">离职</el-button>
              <el-button type="text" size="small">角色</el-button>
              <el-button type="text" size="small" @click="deleteEmployee(row.id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <!-- 分页组件 -->
        <el-row
          type="flex"
          justify="center"
          align="middle"
          style="height: 60px"
        >
          <el-pagination
            layout="prev, pager, next"
            :page-size="page.size"
            :current-page="page.page"
            :total="page.total"
            @current-change="changePage"
          />
        </el-row>
      </el-card>
    </div>
    <!-- 放置新增组件 -->
    <add-employee :show-dialog.sync="showDialog" />
  </div>
</template>

<script>
import { getEmployeeList, delEmployee } from "@/api/employees";
import EmployeeEnum from "@/api/constant/employees";
import AddEmployee from "./components/add-employee.vue"
import { formatDate } from '@/filters'
export default {
  components: { AddEmployee },
  data() {
    return {
      EmployeeEnum,
      loading: false,
      list: [], // 接数据的
      page: {
        page: 1, // 当前页码
        size: 10,
        total: 0, // 总数
      },
      showDialog: false,
    };
  },
  created() {
    this.getEmployeeList();
  },
  methods: {
    changePage(newPage) {
      this.page.page = newPage;
      this.getEmployeeList();
    },
    async getEmployeeList() {
      this.loading = true;
      const { total, rows } = await getEmployeeList(this.page);
      this.page.total = total;
      this.list = rows;
      this.loading = false;
    },
    formatEmployment(row, column, cellValue, index) {
      // 要去找 1所对应的值
      const obj = EmployeeEnum.hireType.find((item) => item.id === cellValue);
      return obj ? obj.value : "未知";
    },
    // 删除员工
    async deleteEmployee(id) {
      try {
        await this.$confirm('您确定删除该员工吗')
        await delEmployee(id)
        this.getEmployeeList()
        this.$message.success('删除员工成功')
      } catch (error) {
        console.log(error)
      }
    },
    // 导出excel
    exportData(isComplex) {
      const headers = {
        '姓名': 'username',
        '手机号': 'mobile',
        '入职日期': 'timeOfEntry',
        '聘用形式': 'formOfEmployment',
        '转正日期': 'correctionTime',
        '工号': 'workNumber',
        '部门': 'departmentName'
      }
      // 导出excel
      import('@/vendor/Export2Excel').then(async excel => {
        //  excel是引入文件的导出对象
        // 导出  header从哪里来
        // data从哪里来
        // 现在没有一个接口获取所有的数据
        // 获取员工的接口 页码 每页条数    100   1 10000
        const { rows } = await getEmployeeList({ page: 1, size: this.page.total })
        const data = this.formatJson(headers, rows) // 返回的data就是 要导出的结构
        const multiHeader = isComplex ? [['姓名', '主要信息', '', '', '', '', '部门']] : []
        const merges = isComplex ? ['A1:A2', 'B1:F1', 'G1:G2'] : []
        excel.export_json_to_excel({
          header: Object.keys(headers),
          data,
          filename: '员工资料表',
          multiHeader, // 复杂表头
          merges // 合并选项
        })

        // excel.export_json_to_excel({
        //   header: ['姓名', '工资'],
        //   data: [['张三', 3000], ['李四', 5000]],
        //   filename: '员工工资表'
        // })
        // [{ username: '张三',mobile: 13112345678 }]  => [[]]
        // 要转化 数据结构 还要和表头的顺序对应上
        // 要求转出的标题是中文
      })
    },
    formatJson(headers, rows) {
      // 对第一层的数组进行遍历
    // {
    //             "id": "604f764971f93f3ac8f365c2",
    //             "mobile": "13800000002",
    //             "username": "管理员3",
    //             "password": "e10adc3949ba59abbe56e057f20f883e",
    //             "timeOfEntry": "2018-11-02",
    //             "formOfEmployment": 1,
    //             "workNumber": "9002",
    //             "correctionTime": "2018-11-30",
    //             "departmentName": "总裁办",
    //             "staffPhoto": "http://q6cu3t6jv.bkt.clouddn.com/1063705989926227968?t=1616204161907"
    //         }
    // 转化成
    // ["604f764971f93f3ac8f365c2","13800000002", "管理员3"]
    // [[],[],[]]
      return rows.map(item => {
        //   Object.values(headers) ['username', 'mobile', 'formOfEmployment']
        // ["604f764971f93f3ac8f365c2","13800000002", "管理员3"]
        return Object.values(headers).map(value => {
          // 此时value就是 字段名
          // item[value] 对应的就是 13800000002 -管理员3 -2018-11-02
          // 需要针对几个字段处理- 聘用形式
          if (value === 'formOfEmployment') {
            // 当字段为聘用形式时 需要知道其值所对应的真的文本
            const obj = this.EmployeeEnum.hireType.find(o => (o.id + '') === (item[value] + ''))
            // 寻找聘用形式对应的文本内容
            return obj ? obj.value : '未知'
          } else if (value === 'timeOfEntry' || value === 'correctionTime') {
            // 当字段是日期时
            return formatDate(item[value])
          }
          return item[value]
        })
      })
    }
  }
};
</script>

<style>
</style>
