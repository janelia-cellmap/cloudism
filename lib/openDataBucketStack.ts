import { Stack, StackProps, aws_s3 as s3, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import { AnyPrincipal, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

const dataBucketCorsRule: s3.CorsRule = {
  allowedMethods : [s3.HttpMethods.GET, s3.HttpMethods.HEAD],
  allowedOrigins : ["*"],
  allowedHeaders : ["*"]
}

interface openDataBucketStackProps extends StackProps {
  bucketName?: string 
}

// This stack generates a s3 bucket with settings compatible 
// with publicly sharing data
export class OpenDataBucketStack extends Stack {
  constructor(scope: Construct, id: string, props?: openDataBucketStackProps) {
    super(scope, id, props);
  
    const bucket_props: s3.BucketProps = {
      bucketName: props?.bucketName,
      cors: [dataBucketCorsRule],
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    }
    const bucket = new s3.Bucket(this, 'bucket', bucket_props);
    
    // This policy differs from the "public access" policy 
    // by allowing List* api calls
    const policy = new PolicyStatement({principals: [new AnyPrincipal()],
    actions: ["s3:List*", "s3:Get*"],
    resources: [`${bucket.bucketArn}/*`, bucket.bucketArn]})
    bucket.addToResourcePolicy(policy)

    const output = new CfnOutput(this, 'bucketName', {
      value: bucket.bucketName,
      description: "The name of the s3 bucket",
      exportName: "openDataBucket"
    })
  }
}
