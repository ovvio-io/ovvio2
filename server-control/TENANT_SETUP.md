# AWS Steps

Login to "Ovvio Production" account (_NOT_ to "Production"). All instructions
assume this account is being used.

## Route53

1. Create a new Hosted Zone named `<tenant id>`.ovvio.io
2. Create NS record for new subdomain in main account Route53

## AWC Certificate Manager

1. Request Public Certificate
2. DNS Validation
3. RSA Algo
4. Click Create Records in Route 53

Wait for certificate to be created

## VPC

1. Switch to the correct AWS region for this tenant.
2. Click _Your VPCs_
3. Click _Create VPC_
4. Choose _VPC and more_ in the wizard
5. Enter tenant id in _Name tag auto generation_
6. Choose _2 Availability Zones_
7. Choose _2 number of public subnets_
8. Choose _NAT Gateways in 1 AZ_ as NAT is used only for installations during
   machine setup.
9. Choose _VPC endpoints S3 Gateway_
10. Add an additional tag named `OvvioTenantId` with the value of the tenant id

Finally, wait for VPC to finish setting up.

## Create Security Groups

### Create Internal Security Group

1. Create a new security group
2. Set name to _`<tenant id>`-internal_
3. Set description to "Internal security group"
4. Assign to correct VPC
5. Add tag named `OvvioTenantId` with the value of the tenant id
6. Create

### Create ALB Security Group

1. Create a new security group
2. Set name to _`<tenant id>`-alb_
3. Set description to "ALB security group"
4. Assign to correct VPC
5. Add tag named `OvvioTenantId` with the value of the tenant id
6. Create

### Configure Internal Security Group

1. Edit the previously created internal group
2. Add inbound rule to Allow All Traffic from ALB group
3. Add outbound rule to Allow All Traffic to Anywhere-IPv4

### Configure ALB Security Group

1. Edit the previously created internal group
2. Add inbound rule to Allow All HTTPS from Anywhere-IPv4
3. Add inbound rule to Allow All HTTPS from Anywhere-IPv6
4. Add inbound rule to Allow All Traffic from Internal Group
5. Add outbound rule to Allow All HTTPS from Anywhere-IPv4
6. Add outbound rule to Allow All HTTPS from Anywhere-IPv6
7. Add outbound rule to Allow All Traffic from Internal Group

## EC2

1. Switch to the correct AWS region for this tenant.
2. Go to Instances > Launch Instance
3. Name: `<tenant-id>`-s1, ...
4. Amazon Linux
5. Choose t3.medium as a starting point
6. Create new private key per tenant called prod-`<tenant-id>`. 6.1 Store the
   private key in 1Password
7. Choose correct VPC
8. Choose correct subnet
9. Auto-assign public IP: _YES_
10. Select existing tenant internal security group
11. Change the root volume to 64GB, encrypted with default KMS key
12. Under Advanced Details, select "ProdServer" IAM Role
13. Termination Protection: Enable
14. Stop Protection: Enable
15. Detailed Cloudwatch Monitoring: Enable
16. Credit Specification: Unlimited
17. Allow tags in metadata: Enable 18: Paste launch-script.sh to User data field

Wait for instance to launch

### Create Load Balancer Target Group

1. Go to Load Balancing > Target Groups > Create Target Group
2. Target Type: Instances
3. Target Group Name: `<tenant-id`-tg.
4. Protocol: HTTP, Port 80
5. Choose correct VPC
6. IPv4
7. Protocol Version: HTTP 2
8. Health Checks: `/healthy`
9. Add tag named `OvvioTenantId` with the value of the tenant id
10. Add previously created instance with port 9000 to the new target group

### Create Application Load Balancer

1. Name: `tenant id`-alb
2. Scheme: Internet Facing
3. IP Addresses: Dualstack
4. Choose correct VPC and assign to all subnets
5. Set correct security group
6. Add previously created target group to an HTTPS listener 6.1. Tag the
   listener with `OvvioTenantId`
7. Add tag named `OvvioTenantId` with the value of the tenant id

Wait for ALB to be created

### Connect ALB to Route 53

1. Go to Route53 > Hosted Zone for tenant
2. Create new A record
3. Set as Alias to ALB
