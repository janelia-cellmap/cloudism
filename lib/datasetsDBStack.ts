import * as cdk from 'aws-cdk-lib';
import {aws_ec2 as ec2, aws_rds as rds} from 'aws-cdk-lib';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { CdkResourceInitializer } from './resourceInitializer';
import { DockerImageCode } from 'aws-cdk-lib/aws-lambda';
  
export class CellmapDB extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
      super(scope, id, props);
      
      const instanceIdentifier = 'cellmap-db';
      const credsSecretName = `/${id}/rds/creds/${instanceIdentifier}`.toLowerCase();
      const creds = new rds.DatabaseSecret(this, 'cellmapRDSCredentials', {secretName: credsSecretName, username: 'admin'})
      // create the VPC
      const vpc = new ec2.Vpc(this, 'CellmapDBVPC', {
        subnetConfiguration: [
          {
            name: 'ingress',
            subnetType: ec2.SubnetType.PUBLIC,
            cidrMask: 24,
          },
          {
            name: 'compute',
            subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
            cidrMask: 28,
          },
          {
            name: 'rds',
            subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
            cidrMask: 28,
          },
        ],
      });
    
      const dbInstance = new rds.DatabaseInstance(this, 'cellmapPostgresRDSInstance', {
        vpc: vpc,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
        engine: rds.DatabaseInstanceEngine.postgres({
          version: rds.PostgresEngineVersion.VER_14_2,
        }),
        instanceType: ec2.InstanceType.of(
          ec2.InstanceClass.BURSTABLE3,
          ec2.InstanceSize.MICRO,
        ),
        databaseName: 'cellmap',
        instanceIdentifier: instanceIdentifier,
        credentials: rds.Credentials.fromGeneratedSecret('postgres'),
        multiAz: false,
        allocatedStorage: 20,
        maxAllocatedStorage: 35,
        allowMajorVersionUpgrade: false,
        autoMinorVersionUpgrade: false,
        backupRetention: cdk.Duration.days(0),
        deleteAutomatedBackups: true,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        deletionProtection: false,
        publiclyAccessible: false,
      });
  
      const initializer = new CdkResourceInitializer(this, 'cellmapDBInitializer', {
        vpc: vpc,
        fnCode: DockerImageCode.fromImageAsset(__dirname + '/../demos/rds-init-fn-code/'),
        fnSecurityGroups: [],
        fnTimeout: cdk.Duration.minutes(2),
        config: {credsSecretName},
        fnLogRetention: RetentionDays.FIVE_DAYS,
        subnetsSelection: vpc.selectSubnets({subnetType: ec2.SubnetType.PRIVATE_WITH_NAT})
    })
        initializer.customResource.node.addDependency(dbInstance);
        dbInstance.connections.allowFrom(initializer.function, ec2.Port.tcp(5432))
        creds.grantRead(initializer.function)
      
        new cdk.CfnOutput(this, 'rdsInitFnResponse', {value: cdk.Token.asString(initializer.response)});
        new cdk.CfnOutput(this, 'dbEndpoint', {value: dbInstance.instanceEndpoint.hostname});
  
      new cdk.CfnOutput(this, 'secretName', {
        // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
        value: dbInstance.secret?.secretName!,
      })
    }
};