# alipay-cloud-devops-codescan

## 项目背景
alipay-cloud-devops-codescan 希望可以帮助开源项目对自身以及贡献者所提交的内容进行安全漏洞扫描以及开源合规扫描


## 接入方式
### 项目中没有接入任何工作流程

1、 进入需要添加模版仓库点击Actions->New workflow
 
2、进入New workflow后点击set up a workflow yourself自行设置工作模版

3、创建一个名为cloud_code_scan.yml的文件，并将下面的内容复制进来

### 项目已存在其他模版添加流程
1、进入项目 .github->workflows路径

2、创建一个名为cloud_code_scan.yml的文件，并将下面的内容复制进来

3、升级stc组件扫描到源蜥平台请配置CYBERSEC_TOKEN

```yaml
name: Alipay Cloud Devops Codescan
on:
  pull_request_target: 
jobs:
  #  # stc作业使用了ubuntu-latest作为运行环境，包含了一个步骤（steps）codeScan，该步骤使用了layotto/alipay-cloud-devops-codescan@main作为GitHub Action，并传入了一些参数（parent_uid、private_key、code_type）
  stc:   # 安全扫描
    runs-on: ubuntu-latest
    steps:
      - name: codeScan
        uses: Ant-OSS-Utility-Set/alipay-cloud-devops-codescan@main
        with:
          parent_uid: ${{ secrets.ALI_PID }}
          private_key: ${{ secrets.ALI_PK }}
          # 按需配置，如果需要接入源蜥平台服务请配置一下token
          # cybersec_token: ${{ secrets.CYBERSEC_TOKEN }}
          scan_type: stc 
          # 按需配置，不配置为空即可注意‘’中需要有空格，或直接去点tips
          tips: '可以加入钉钉群：xxxx  来申请查看权限' 
    # sca作业也使用了ubuntu-latest作为运行环境。sca作业也包含了一个步骤codeScan，使用了相同的GitHub Action，并传入了相同的参数。
   # 此YAML文件定义了两个作业，分别用于进行安全扫描和开源合规的代码扫描，使用了相同的GitHub Action，并传入了不同的参数。
  sca:   # 开源合规
    runs-on: ubuntu-latest
    steps:
      - name: codeScan
        uses: Ant-OSS-Utility-Set/alipay-cloud-devops-codescan@main
        with:
          parent_uid: ${{ secrets.ALI_PID }}
          private_key: ${{ secrets.ALI_PK }}
          scan_type: sca
          # 按需配置，不配置为空即可注意‘’中需要有空格，或直接去点tips
          tips: '可以加入钉钉群：xxxx  来申请查看权限' 
```
