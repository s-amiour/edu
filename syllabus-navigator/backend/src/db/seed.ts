import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

interface TopicDef {
  name: string;
  description: string;
  objectives: { description: string; bloomLevel: string }[];
}

interface ModuleDef {
  name: string;
  description: string;
  topics: TopicDef[];
}

interface CourseDef {
  code: string;
  name: string;
  description: string;
  semester: string;
  modules: ModuleDef[];
  assessments: {
    type: Prisma.AssessmentType;
    name: string;
    weight: number;
    dueDate: Date;
    description: string;
  }[];
}

const iamCourse: CourseDef = {
  code: "CS401",
  name: "IAM Fundamentals",
  description:
    "Comprehensive study of Identity and Access Management systems covering authentication, authorization, identity lifecycle, federation, and governance.",
  semester: "Semester 5",
  modules: [
    {
      name: "Introduction to IAM",
      description:
        "Foundational concepts of Identity and Access Management and its role in cybersecurity.",
      topics: [
        {
          name: "IAM Fundamentals",
          description: "Core definitions and the purpose of IAM in modern organizations.",
          objectives: [
            { description: "Define Identity and Access Management and its core components.", bloomLevel: "Remember" },
            { description: "Explain the role of IAM in enterprise security architecture.", bloomLevel: "Understand" },
          ],
        },
        {
          name: "Core IAM Concepts",
          description: "The four pillars: Identity, Authentication, Authorization, and Accounting (IAAA).",
          objectives: [
            { description: "Distinguish between identity, authentication, authorization, and accounting.", bloomLevel: "Understand" },
            { description: "Apply the IAAA framework to real-world access control scenarios.", bloomLevel: "Apply" },
          ],
        },
        {
          name: "IAM in Cybersecurity",
          description: "How IAM fits within the broader cybersecurity landscape and threat models.",
          objectives: [
            { description: "Analyze the relationship between IAM and common cybersecurity threats.", bloomLevel: "Analyze" },
            { description: "Evaluate IAM controls against the CIA triad.", bloomLevel: "Evaluate" },
          ],
        },
        {
          name: "IGA vs AM",
          description: "Comparing Identity Governance & Administration with Access Management approaches.",
          objectives: [
            { description: "Compare and contrast IGA and AM strategies.", bloomLevel: "Analyze" },
            { description: "Determine appropriate use cases for IGA versus AM solutions.", bloomLevel: "Evaluate" },
          ],
        },
      ],
    },
    {
      name: "Authentication Mechanisms",
      description: "Methods and protocols for verifying user identity in digital systems.",
      topics: [
        {
          name: "Password Authentication",
          description: "Password-based authentication, hashing, salting, and credential storage.",
          objectives: [
            { description: "Explain secure password storage mechanisms including hashing and salting.", bloomLevel: "Understand" },
            { description: "Evaluate password policies against NIST guidelines.", bloomLevel: "Evaluate" },
          ],
        },
        {
          name: "Multi-Factor Authentication",
          description: "Combining knowledge, possession, and inherence factors for stronger authentication.",
          objectives: [
            { description: "Identify and classify the three authentication factors.", bloomLevel: "Remember" },
            { description: "Design an MFA scheme for a given security requirement.", bloomLevel: "Create" },
          ],
        },
        {
          name: "Biometric Authentication",
          description: "Physiological and behavioral biometric modalities and their trade-offs.",
          objectives: [
            { description: "Compare biometric modalities in terms of FAR, FRR, and usability.", bloomLevel: "Analyze" },
            { description: "Assess privacy implications of biometric data storage.", bloomLevel: "Evaluate" },
          ],
        },
        {
          name: "Adaptive Authentication",
          description: "Risk-based and context-aware authentication that adjusts to threat levels.",
          objectives: [
            { description: "Explain how adaptive authentication adjusts security based on context.", bloomLevel: "Understand" },
            { description: "Design a risk-scoring model for adaptive authentication decisions.", bloomLevel: "Create" },
            { description: "Evaluate the trade-off between security and user experience.", bloomLevel: "Evaluate" },
          ],
        },
      ],
    },
    {
      name: "Authorization Models",
      description: "Frameworks for determining what resources authenticated users can access.",
      topics: [
        {
          name: "Role-Based Access Control",
          description: "RBAC model with roles, permissions, and role hierarchies.",
          objectives: [
            { description: "Define the components of the RBAC model.", bloomLevel: "Remember" },
            { description: "Design an RBAC policy for an organizational structure.", bloomLevel: "Create" },
          ],
        },
        {
          name: "Attribute-Based Access Control",
          description: "ABAC using subject, resource, action, and environment attributes.",
          objectives: [
            { description: "Construct ABAC policies using attribute combinations.", bloomLevel: "Apply" },
            { description: "Compare ABAC flexibility with RBAC simplicity.", bloomLevel: "Analyze" },
          ],
        },
        {
          name: "Policy Administration",
          description: "Centralized policy management, XACML, and policy decision points.",
          objectives: [
            { description: "Explain the architecture of policy administration points and decision points.", bloomLevel: "Understand" },
            { description: "Write access control policies in a formal policy language.", bloomLevel: "Apply" },
          ],
        },
        {
          name: "Least Privilege",
          description: "Principle of least privilege and just-in-time access provisioning.",
          objectives: [
            { description: "Apply the principle of least privilege to system design.", bloomLevel: "Apply" },
            { description: "Audit existing permissions for privilege creep.", bloomLevel: "Analyze" },
            { description: "Implement just-in-time access provisioning strategies.", bloomLevel: "Create" },
          ],
        },
      ],
    },
    {
      name: "Identity Lifecycle",
      description: "Managing digital identities from creation through deprovisioning.",
      topics: [
        {
          name: "Provisioning",
          description: "Automated account creation, role assignment, and onboarding workflows.",
          objectives: [
            { description: "Describe automated provisioning workflows for new employees.", bloomLevel: "Understand" },
            { description: "Design a provisioning pipeline integrating HR and IT systems.", bloomLevel: "Create" },
          ],
        },
        {
          name: "Deprovisioning",
          description: "Timely access revocation during offboarding and role changes.",
          objectives: [
            { description: "Explain the security risks of delayed deprovisioning.", bloomLevel: "Understand" },
            { description: "Design a deprovisioning workflow that prevents orphaned accounts.", bloomLevel: "Create" },
          ],
        },
        {
          name: "Identity Governance",
          description: "Policies, processes, and oversight for managing identity at scale.",
          objectives: [
            { description: "Define the components of an identity governance framework.", bloomLevel: "Remember" },
            { description: "Evaluate governance maturity using industry benchmarks.", bloomLevel: "Evaluate" },
          ],
        },
        {
          name: "Access Certification",
          description: "Periodic review and attestation of user access rights.",
          objectives: [
            { description: "Design an access certification campaign for an enterprise.", bloomLevel: "Create" },
            { description: "Analyze certification results to identify segregation-of-duty violations.", bloomLevel: "Analyze" },
          ],
        },
      ],
    },
    {
      name: "Federated Identity & SSO",
      description: "Cross-domain identity management and single sign-on protocols.",
      topics: [
        {
          name: "SAML",
          description: "Security Assertion Markup Language for enterprise SSO.",
          objectives: [
            { description: "Trace a SAML authentication flow between SP and IdP.", bloomLevel: "Analyze" },
            { description: "Configure a SAML assertion with required attributes.", bloomLevel: "Apply" },
          ],
        },
        {
          name: "OAuth 2.0",
          description: "Authorization framework for delegated access to resources.",
          objectives: [
            { description: "Diagram the OAuth 2.0 authorization code flow.", bloomLevel: "Apply" },
            { description: "Distinguish between OAuth grants and their appropriate use cases.", bloomLevel: "Analyze" },
          ],
        },
        {
          name: "OpenID Connect",
          description: "Identity layer built on OAuth 2.0 for authentication.",
          objectives: [
            { description: "Explain how OIDC extends OAuth 2.0 with authentication.", bloomLevel: "Understand" },
            { description: "Parse and validate a JWT ID token.", bloomLevel: "Apply" },
            { description: "Compare OIDC with SAML for different deployment scenarios.", bloomLevel: "Evaluate" },
          ],
        },
        {
          name: "Identity Providers",
          description: "Design and operation of centralized and federated identity providers.",
          objectives: [
            { description: "Compare centralized versus federated IdP architectures.", bloomLevel: "Analyze" },
            { description: "Evaluate IdP solutions for organizational requirements.", bloomLevel: "Evaluate" },
          ],
        },
      ],
    },
    {
      name: "Governance",
      description: "Compliance, auditing, risk management, and metrics for IAM programs.",
      topics: [
        {
          name: "Compliance Frameworks",
          description: "Regulatory requirements (GDPR, SOX, HIPAA) and their impact on IAM.",
          objectives: [
            { description: "Map IAM controls to regulatory compliance requirements.", bloomLevel: "Apply" },
            { description: "Assess an organization's IAM posture against a compliance framework.", bloomLevel: "Evaluate" },
          ],
        },
        {
          name: "Audit & Monitoring",
          description: "Logging, monitoring, and auditing IAM events for security and compliance.",
          objectives: [
            { description: "Design an IAM audit logging strategy.", bloomLevel: "Create" },
            { description: "Analyze access logs to detect anomalous behavior.", bloomLevel: "Analyze" },
          ],
        },
        {
          name: "Risk Assessment",
          description: "Identifying and mitigating identity-related security risks.",
          objectives: [
            { description: "Perform a risk assessment for identity-related threats.", bloomLevel: "Apply" },
            { description: "Prioritize IAM risks using quantitative and qualitative methods.", bloomLevel: "Evaluate" },
          ],
        },
        {
          name: "IAM Metrics",
          description: "KPIs and reporting for measuring IAM program effectiveness.",
          objectives: [
            { description: "Define KPIs for measuring IAM program maturity.", bloomLevel: "Create" },
            { description: "Interpret IAM metrics to identify improvement areas.", bloomLevel: "Analyze" },
            { description: "Design an IAM dashboard for executive reporting.", bloomLevel: "Create" },
          ],
        },
      ],
    },
  ],
  assessments: [
    { type: "EXAM", name: "Midterm Exam", weight: 30, dueDate: new Date("2026-04-15"), description: "Covers modules 1-3: Introduction, Authentication, and Authorization." },
    { type: "EXAM", name: "Final Exam", weight: 50, dueDate: new Date("2026-06-10"), description: "Comprehensive exam covering all six modules." },
    { type: "PROJECT", name: "IAM System Design Project", weight: 20, dueDate: new Date("2026-05-20"), description: "Design a complete IAM solution for a fictional enterprise." },
  ],
};

const countingCourse: CourseDef = {
  code: "MA201",
  name: "Counting & Enumerating",
  description:
    "Mathematical techniques for counting, enumerating, and formalizing combinatorial problems.",
  semester: "Semester 3",
  modules: [
    {
      name: "Cardinal Numbers",
      description: "Foundations of counting through set cardinality and its properties.",
      topics: [
        {
          name: "Finite Set Cardinality",
          description: "Counting elements in finite sets and understanding cardinality.",
          objectives: [
            { description: "Determine the cardinality of finite sets in various contexts.", bloomLevel: "Apply" },
            { description: "Explain the concept of cardinality for finite collections.", bloomLevel: "Understand" },
          ],
        },
        {
          name: "Union/Intersection Cardinality",
          description: "Computing cardinalities of set unions and intersections.",
          objectives: [
            { description: "Compute the cardinality of unions and intersections of sets.", bloomLevel: "Apply" },
            { description: "Prove basic cardinality identities for set operations.", bloomLevel: "Analyze" },
          ],
        },
        {
          name: "Inclusion-Exclusion",
          description: "The inclusion-exclusion principle for counting overlapping sets.",
          objectives: [
            { description: "Apply the inclusion-exclusion principle to counting problems.", bloomLevel: "Apply" },
            { description: "Derive the inclusion-exclusion formula for n sets.", bloomLevel: "Analyze" },
            { description: "Solve real-world counting problems using inclusion-exclusion.", bloomLevel: "Apply" },
          ],
        },
      ],
    },
    {
      name: "Formalizing Counting",
      description: "Mathematical frameworks for modeling and solving counting problems.",
      topics: [
        {
          name: "Problem Modeling",
          description: "Translating real-world scenarios into formal counting problems.",
          objectives: [
            { description: "Translate word problems into formal counting frameworks.", bloomLevel: "Apply" },
            { description: "Identify the appropriate counting technique for a given problem.", bloomLevel: "Analyze" },
          ],
        },
        {
          name: "Reference Situations",
          description: "Standard counting situations that serve as building blocks.",
          objectives: [
            { description: "Identify standard reference situations in counting problems.", bloomLevel: "Remember" },
            { description: "Classify problems by their reference situation type.", bloomLevel: "Analyze" },
          ],
        },
        {
          name: "Bijection Method",
          description: "Proving equal cardinalities by constructing bijections between sets.",
          objectives: [
            { description: "Construct bijections to prove two sets have equal cardinality.", bloomLevel: "Apply" },
            { description: "Use the bijection method to simplify complex counting problems.", bloomLevel: "Analyze" },
            { description: "Prove combinatorial identities using bijective proofs.", bloomLevel: "Create" },
          ],
        },
      ],
    },
    {
      name: "Combinatorics",
      description: "Core combinatorial techniques: permutations, combinations, and binomial theory.",
      topics: [
        {
          name: "Permutations",
          description: "Counting ordered arrangements of distinct objects.",
          objectives: [
            { description: "Calculate the number of permutations of n objects.", bloomLevel: "Apply" },
            { description: "Solve problems involving permutations with repetitions.", bloomLevel: "Apply" },
          ],
        },
        {
          name: "Arrangements",
          description: "Counting k-permutations: selecting and ordering subsets.",
          objectives: [
            { description: "Compute the number of k-arrangements from n objects.", bloomLevel: "Apply" },
            { description: "Distinguish between permutations and arrangements.", bloomLevel: "Analyze" },
          ],
        },
        {
          name: "Combinations",
          description: "Counting unordered selections of subsets.",
          objectives: [
            { description: "Calculate binomial coefficients for combination problems.", bloomLevel: "Apply" },
            { description: "Differentiate between permutation and combination scenarios.", bloomLevel: "Analyze" },
          ],
        },
        {
          name: "Binomial Theorem",
          description: "Expansion of binomial expressions and coefficient properties.",
          objectives: [
            { description: "Expand binomial expressions using the binomial theorem.", bloomLevel: "Apply" },
            { description: "Prove the binomial theorem by induction.", bloomLevel: "Analyze" },
            { description: "Use the binomial theorem to derive combinatorial identities.", bloomLevel: "Create" },
          ],
        },
        {
          name: "Pascal's Formula",
          description: "Pascal's triangle, recursive relationships, and combinatorial proofs.",
          objectives: [
            { description: "Apply Pascal's formula to compute binomial coefficients.", bloomLevel: "Apply" },
            { description: "Prove Pascal's formula using both algebraic and combinatorial arguments.", bloomLevel: "Analyze" },
          ],
        },
      ],
    },
    {
      name: "Applications",
      description: "Applying counting techniques to algorithms, representations, and graphs.",
      topics: [
        {
          name: "Algorithmic Counting",
          description: "Counting techniques in algorithm analysis and complexity.",
          objectives: [
            { description: "Apply counting techniques to analyze algorithm complexity.", bloomLevel: "Apply" },
            { description: "Count the number of possible inputs for a given algorithm.", bloomLevel: "Analyze" },
          ],
        },
        {
          name: "Binary Representations",
          description: "Counting with binary strings, subsets, and power sets.",
          objectives: [
            { description: "Establish bijections between binary strings and subsets.", bloomLevel: "Apply" },
            { description: "Count objects using binary representation techniques.", bloomLevel: "Analyze" },
          ],
        },
        {
          name: "Graph Counting",
          description: "Counting paths, cycles, and subgraphs in combinatorial graph theory.",
          objectives: [
            { description: "Count paths and cycles in simple graphs.", bloomLevel: "Apply" },
            { description: "Apply counting techniques to graph coloring problems.", bloomLevel: "Analyze" },
            { description: "Derive formulas for counting labeled graphs.", bloomLevel: "Create" },
          ],
        },
      ],
    },
  ],
  assessments: [
    { type: "HOMEWORK", name: "Weekly Problem Sets", weight: 20, dueDate: new Date("2026-05-30"), description: "Weekly homework assignments covering counting techniques." },
    { type: "EXAM", name: "Midterm Exam", weight: 30, dueDate: new Date("2026-04-10"), description: "Covers cardinal numbers and formalizing counting." },
    { type: "EXAM", name: "Final Exam", weight: 50, dueDate: new Date("2026-06-08"), description: "Comprehensive exam covering all modules." },
  ],
};

const probabilityCourse: CourseDef = {
  code: "MA301",
  name: "Probability",
  description:
    "Rigorous introduction to probability theory from axioms to random variables and distributions.",
  semester: "Semester 5",
  modules: [
    {
      name: "Probability Space",
      description: "Foundations of probability: sample spaces, events, and measure-theoretic axioms.",
      topics: [
        {
          name: "Random Experiments",
          description: "Defining sample spaces and events from random phenomena.",
          objectives: [
            { description: "Define sample spaces for various random experiments.", bloomLevel: "Apply" },
            { description: "Distinguish between outcomes, events, and sample spaces.", bloomLevel: "Understand" },
          ],
        },
        {
          name: "Set Theory Review",
          description: "Set operations, Venn diagrams, and De Morgan's laws for event algebra.",
          objectives: [
            { description: "Apply set operations to combine and compare events.", bloomLevel: "Apply" },
            { description: "Use De Morgan's laws to simplify event expressions.", bloomLevel: "Analyze" },
          ],
        },
        {
          name: "Probability Functions",
          description: "Defining probability measures and their basic properties.",
          objectives: [
            { description: "Compute probabilities using the axioms of probability.", bloomLevel: "Apply" },
            { description: "Derive basic probability properties from the axioms.", bloomLevel: "Analyze" },
            { description: "Assign probability measures to finite sample spaces.", bloomLevel: "Apply" },
          ],
        },
        {
          name: "Kolmogorov Axioms",
          description: "The three axioms of probability and their consequences.",
          objectives: [
            { description: "State and explain the three Kolmogorov axioms.", bloomLevel: "Remember" },
            { description: "Prove derived probability rules from the Kolmogorov axioms.", bloomLevel: "Analyze" },
          ],
        },
      ],
    },
    {
      name: "Conditional Probability",
      description: "Updating probabilities given partial information and independence.",
      topics: [
        {
          name: "Conditional Definition",
          description: "Formal definition of conditional probability and its interpretation.",
          objectives: [
            { description: "Compute conditional probabilities from joint and marginal distributions.", bloomLevel: "Apply" },
            { description: "Interpret conditional probability in real-world contexts.", bloomLevel: "Understand" },
          ],
        },
        {
          name: "Bayes' Theorem",
          description: "Reversing conditional probabilities using Bayes' theorem.",
          objectives: [
            { description: "Apply Bayes' theorem to update probabilities with new evidence.", bloomLevel: "Apply" },
            { description: "Construct prior and posterior distributions for inference problems.", bloomLevel: "Create" },
          ],
        },
        {
          name: "Independence",
          description: "Formal definition and implications of independent events.",
          objectives: [
            { description: "Determine whether events are independent using the formal definition.", bloomLevel: "Apply" },
            { description: "Distinguish between independence and mutual exclusivity.", bloomLevel: "Analyze" },
            { description: "Apply independence to simplify probability calculations.", bloomLevel: "Analyze" },
          ],
        },
        {
          name: "Total Probability",
          description: "The law of total probability and partitioning sample spaces.",
          objectives: [
            { description: "Apply the law of total probability to compute marginal probabilities.", bloomLevel: "Apply" },
            { description: "Partition sample spaces effectively for complex probability problems.", bloomLevel: "Analyze" },
          ],
        },
      ],
    },
    {
      name: "Discrete Random Variables",
      description: "Discrete distributions, expectation, variance, and common discrete models.",
      topics: [
        {
          name: "PMF & CDF",
          description: "Probability mass functions and cumulative distribution functions for discrete RVs.",
          objectives: [
            { description: "Define and compute PMFs and CDFs for discrete random variables.", bloomLevel: "Apply" },
            { description: "Use the CDF to compute probabilities of events.", bloomLevel: "Apply" },
          ],
        },
        {
          name: "Expected Value & Variance",
          description: "Measures of central tendency and spread for discrete distributions.",
          objectives: [
            { description: "Compute expected value and variance of discrete random variables.", bloomLevel: "Apply" },
            { description: "Apply linearity of expectation to sums of random variables.", bloomLevel: "Analyze" },
            { description: "Use variance properties to analyze distributions.", bloomLevel: "Analyze" },
          ],
        },
        {
          name: "Common Distributions",
          description: "Bernoulli, Binomial, and Poisson distributions and their applications.",
          objectives: [
            { description: "Identify scenarios modeled by Bernoulli, Binomial, and Poisson distributions.", bloomLevel: "Analyze" },
            { description: "Compute probabilities and moments for each discrete distribution.", bloomLevel: "Apply" },
            { description: "Approximate Binomial with Poisson under appropriate conditions.", bloomLevel: "Evaluate" },
          ],
        },
      ],
    },
    {
      name: "Continuous Random Variables",
      description: "Continuous distributions, density functions, and key continuous models.",
      topics: [
        {
          name: "PDF & CDF",
          description: "Probability density functions and CDFs for continuous random variables.",
          objectives: [
            { description: "Define and compute PDFs and CDFs for continuous random variables.", bloomLevel: "Apply" },
            { description: "Relate PDF and CDF through differentiation and integration.", bloomLevel: "Analyze" },
          ],
        },
        {
          name: "Expected Value",
          description: "Expectation and variance for continuous distributions.",
          objectives: [
            { description: "Compute expected value and variance using integral definitions.", bloomLevel: "Apply" },
            { description: "Apply the law of the unconscious statistician for transformations.", bloomLevel: "Analyze" },
          ],
        },
        {
          name: "Normal Distribution",
          description: "The Gaussian distribution, standardization, and the Central Limit Theorem.",
          objectives: [
            { description: "Compute probabilities using the standard normal distribution.", bloomLevel: "Apply" },
            { description: "Apply the Central Limit Theorem to approximate distributions.", bloomLevel: "Analyze" },
            { description: "Evaluate when the normal approximation is appropriate.", bloomLevel: "Evaluate" },
          ],
        },
        {
          name: "Exponential Distribution",
          description: "Memoryless property, relationship to Poisson processes, and applications.",
          objectives: [
            { description: "Compute probabilities and moments of the exponential distribution.", bloomLevel: "Apply" },
            { description: "Explain the memoryless property and its implications.", bloomLevel: "Understand" },
            { description: "Model waiting times using the exponential distribution.", bloomLevel: "Create" },
          ],
        },
      ],
    },
  ],
  assessments: [
    { type: "HOMEWORK", name: "Weekly Problem Sets", weight: 20, dueDate: new Date("2026-05-30"), description: "Weekly homework covering probability theory and distributions." },
    { type: "EXAM", name: "Midterm Exam", weight: 30, dueDate: new Date("2026-04-12"), description: "Covers probability spaces and conditional probability." },
    { type: "EXAM", name: "Final Exam", weight: 50, dueDate: new Date("2026-06-12"), description: "Comprehensive exam covering all modules." },
  ],
};

const courseDefs = [iamCourse, countingCourse, probabilityCourse];

async function main() {
  console.log("Seeding database...");

  const studentPassword = await bcrypt.hash("student123", 12);
  const professorPassword = await bcrypt.hash("prof123", 12);

  const student = await prisma.user.upsert({
    where: { email: "student@edu.com" },
    update: {},
    create: {
      email: "student@edu.com",
      name: "Alice Student",
      passwordHash: studentPassword,
      role: "STUDENT",
      programLevel: "intermediate",
    },
  });

  const professor = await prisma.user.upsert({
    where: { email: "professor@edu.com" },
    update: {},
    create: {
      email: "professor@edu.com",
      name: "Dr. Bob Professor",
      passwordHash: professorPassword,
      role: "PROFESSOR",
      programLevel: "advanced",
    },
  });

  console.log(`Users: student=${student.id}, professor=${professor.id}`);

  await prisma.course.deleteMany({});

  const topicMap = new Map<string, { id: string; courseCode: string }>();
  const allCourseIds: { code: string; id: string }[] = [];

  for (const def of courseDefs) {
    const course = await prisma.course.create({
      data: {
        code: def.code,
        name: def.name,
        description: def.description,
        semester: def.semester,
        professorId: professor.id,
      },
    });

    allCourseIds.push({ code: def.code, id: course.id });

    for (let mi = 0; mi < def.modules.length; mi++) {
      const modDef = def.modules[mi];
      const mod = await prisma.module.create({
        data: {
          courseId: course.id,
          name: modDef.name,
          order: mi + 1,
          description: modDef.description,
        },
      });

      for (let ti = 0; ti < modDef.topics.length; ti++) {
        const topicDef = modDef.topics[ti];
        const topic = await prisma.topic.create({
          data: {
            moduleId: mod.id,
            name: topicDef.name,
            description: topicDef.description,
            order: ti + 1,
          },
        });

        topicMap.set(`${def.code}:${topicDef.name}`, { id: topic.id, courseCode: def.code });

        for (const obj of topicDef.objectives) {
          await prisma.learningObjective.create({
            data: {
              topicId: topic.id,
              description: obj.description,
              bloomLevel: obj.bloomLevel,
            },
          });
        }
      }
    }

    for (const a of def.assessments) {
      await prisma.assessment.create({
        data: {
          courseId: course.id,
          type: a.type,
          name: a.name,
          weight: a.weight,
          dueDate: a.dueDate,
          description: a.description,
        },
      });
    }

    console.log(`Created course ${def.code}: ${def.name} (${def.modules.length} modules)`);
  }

  const getTopicId = (key: string): string => {
    const entry = topicMap.get(key);
    if (!entry) throw new Error(`Topic not found: ${key}`);
    return entry.id;
  };

  const prereqPairs: [string, string][] = [
    ["CS401:IAM Fundamentals", "CS401:Core IAM Concepts"],
    ["CS401:Core IAM Concepts", "CS401:IAM in Cybersecurity"],
    ["CS401:IAM in Cybersecurity", "CS401:IGA vs AM"],
    ["CS401:Password Authentication", "CS401:Multi-Factor Authentication"],
    ["CS401:Multi-Factor Authentication", "CS401:Biometric Authentication"],
    ["CS401:Biometric Authentication", "CS401:Adaptive Authentication"],
    ["CS401:Role-Based Access Control", "CS401:Attribute-Based Access Control"],
    ["CS401:Attribute-Based Access Control", "CS401:Policy Administration"],
    ["CS401:Policy Administration", "CS401:Least Privilege"],
    ["CS401:Provisioning", "CS401:Deprovisioning"],
    ["CS401:Deprovisioning", "CS401:Identity Governance"],
    ["CS401:Identity Governance", "CS401:Access Certification"],
    ["CS401:SAML", "CS401:OAuth 2.0"],
    ["CS401:OAuth 2.0", "CS401:OpenID Connect"],
    ["CS401:OpenID Connect", "CS401:Identity Providers"],
    ["CS401:Compliance Frameworks", "CS401:Audit & Monitoring"],
    ["CS401:Audit & Monitoring", "CS401:Risk Assessment"],
    ["CS401:Risk Assessment", "CS401:IAM Metrics"],
    ["CS401:Password Authentication", "CS401:Role-Based Access Control"],
    ["CS401:Multi-Factor Authentication", "CS401:SAML"],
    ["MA201:Finite Set Cardinality", "MA201:Union/Intersection Cardinality"],
    ["MA201:Union/Intersection Cardinality", "MA201:Inclusion-Exclusion"],
    ["MA201:Problem Modeling", "MA201:Reference Situations"],
    ["MA201:Reference Situations", "MA201:Bijection Method"],
    ["MA201:Permutations", "MA201:Arrangements"],
    ["MA201:Arrangements", "MA201:Combinations"],
    ["MA201:Combinations", "MA201:Binomial Theorem"],
    ["MA201:Binomial Theorem", "MA201:Pascal's Formula"],
    ["MA201:Algorithmic Counting", "MA201:Binary Representations"],
    ["MA201:Binary Representations", "MA201:Graph Counting"],
    ["MA201:Bijection Method", "MA201:Permutations"],
    ["MA301:Random Experiments", "MA301:Set Theory Review"],
    ["MA301:Set Theory Review", "MA301:Probability Functions"],
    ["MA301:Probability Functions", "MA301:Kolmogorov Axioms"],
    ["MA301:Conditional Definition", "MA301:Bayes' Theorem"],
    ["MA301:Bayes' Theorem", "MA301:Independence"],
    ["MA301:Independence", "MA301:Total Probability"],
    ["MA301:PMF & CDF", "MA301:Expected Value & Variance"],
    ["MA301:Expected Value & Variance", "MA301:Common Distributions"],
    ["MA301:PDF & CDF", "MA301:Expected Value"],
    ["MA301:Expected Value", "MA301:Normal Distribution"],
    ["MA301:Normal Distribution", "MA301:Exponential Distribution"],
    ["MA301:Kolmogorov Axioms", "MA301:Conditional Definition"],
    ["MA301:Total Probability", "MA301:PMF & CDF"],
    ["MA301:Common Distributions", "MA301:PDF & CDF"],
    ["MA201:Inclusion-Exclusion", "MA301:Probability Functions"],
  ];

  for (const [preKey, depKey] of prereqPairs) {
    await prisma.prerequisite.create({
      data: {
        prerequisiteTopicId: getTopicId(preKey),
        dependentTopicId: getTopicId(depKey),
      },
    });
  }

  const countingCourseId = allCourseIds.find((c) => c.code === "MA201")!.id;
  const probabilityCourseId = allCourseIds.find((c) => c.code === "MA301")!.id;
  await prisma.coursePrerequisite.create({
    data: {
      prerequisiteCourseId: countingCourseId,
      dependentCourseId: probabilityCourseId,
    },
  });

  console.log(`Created ${prereqPairs.length} topic prerequisites + 1 course prerequisite`);

  const masteryStates: { topicKey: string; state: "UNSEEN" | "SEEN" | "PRACTICED" | "CONFIDENT"; score: number | null }[] = [
    { topicKey: "CS401:IAM Fundamentals", state: "CONFIDENT", score: 92 },
    { topicKey: "CS401:Core IAM Concepts", state: "CONFIDENT", score: 88 },
    { topicKey: "CS401:IAM in Cybersecurity", state: "PRACTICED", score: 75 },
    { topicKey: "CS401:IGA vs AM", state: "SEEN", score: null },
    { topicKey: "CS401:Password Authentication", state: "CONFIDENT", score: 95 },
    { topicKey: "CS401:Multi-Factor Authentication", state: "PRACTICED", score: 70 },
    { topicKey: "CS401:Biometric Authentication", state: "SEEN", score: null },
    { topicKey: "CS401:Adaptive Authentication", state: "UNSEEN", score: null },
    { topicKey: "CS401:Role-Based Access Control", state: "PRACTICED", score: 68 },
    { topicKey: "CS401:Attribute-Based Access Control", state: "SEEN", score: null },
    { topicKey: "CS401:Policy Administration", state: "UNSEEN", score: null },
    { topicKey: "CS401:Least Privilege", state: "UNSEEN", score: null },
    { topicKey: "MA201:Finite Set Cardinality", state: "CONFIDENT", score: 90 },
    { topicKey: "MA201:Union/Intersection Cardinality", state: "PRACTICED", score: 78 },
    { topicKey: "MA201:Inclusion-Exclusion", state: "SEEN", score: null },
    { topicKey: "MA201:Permutations", state: "CONFIDENT", score: 85 },
    { topicKey: "MA201:Combinations", state: "PRACTICED", score: 72 },
    { topicKey: "MA301:Random Experiments", state: "CONFIDENT", score: 88 },
    { topicKey: "MA301:Set Theory Review", state: "PRACTICED", score: 80 },
    { topicKey: "MA301:Probability Functions", state: "SEEN", score: null },
    { topicKey: "MA301:Conditional Definition", state: "UNSEEN", score: null },
  ];

  for (const m of masteryStates) {
    const entry = topicMap.get(m.topicKey);
    if (!entry) continue;
    await prisma.masteryRecord.create({
      data: {
        studentId: student.id,
        topicId: entry.id,
        state: m.state,
        score: m.score,
        lastInteractedAt: new Date(Date.now() - Math.random() * 7 * 86400000),
      },
    });
  }

  console.log(`Created ${masteryStates.length} mastery records`);

  const iamQuiz = await prisma.quiz.create({
    data: {
      title: "Authentication Mechanisms Quiz",
      courseId: allCourseIds.find((c) => c.code === "CS401")!.id,
      topicId: getTopicId("CS401:Password Authentication"),
      questions: [
        {
          id: "q1",
          text: "Which hashing algorithm is recommended for password storage?",
          options: ["MD5", "SHA-1", "bcrypt", "AES"],
          correctIndex: 2,
          explanation: "bcrypt is specifically designed for password hashing with built-in salting and adjustable cost factor.",
        },
        {
          id: "q2",
          text: "What does MFA stand for?",
          options: ["Multi-Factor Authentication", "Main Frame Access", "Managed File Archive", "Master File Allocation"],
          correctIndex: 0,
          explanation: "MFA requires two or more independent authentication factors.",
        },
        {
          id: "q3",
          text: "Which is NOT a valid authentication factor type?",
          options: ["Knowledge", "Possession", "Inherence", "Preference"],
          correctIndex: 3,
          explanation: "The three factor types are knowledge (something you know), possession (something you have), and inherence (something you are).",
        },
      ],
    },
  });

  const ma201Quiz = await prisma.quiz.create({
    data: {
      title: "Cardinal Numbers Quiz",
      courseId: allCourseIds.find((c) => c.code === "MA201")!.id,
      topicId: getTopicId("MA201:Finite Set Cardinality"),
      questions: [
        {
          id: "q1",
          text: "What is the cardinality of the set {a, b, c, a, b}?",
          options: ["5", "3", "2", "4"],
          correctIndex: 1,
          explanation: "Sets contain unique elements, so {a, b, c, a, b} = {a, b, c} which has cardinality 3.",
        },
        {
          id: "q2",
          text: "If |A| = 5 and |B| = 3 and |A ∩ B| = 2, what is |A ∪ B|?",
          options: ["8", "6", "10", "5"],
          correctIndex: 1,
          explanation: "|A ∪ B| = |A| + |B| - |A ∩ B| = 5 + 3 - 2 = 6.",
        },
      ],
  });

  const ma301Quiz = await prisma.quiz.create({
    data: {
      title: "Probability Space Quiz",
      courseId: probabilityCourseId,
      topicId: getTopicId("MA301:Random Experiments"),
      questions: [
        {
          id: "q1",
          text: "What is the probability of the entire sample space?",
          options: ["0", "0.5", "1", "Depends on the experiment"],
          correctIndex: 2,
          explanation: "By the axioms of probability, P(S) = 1 where S is the sample space.",
        },
        {
          id: "q2",
          text: "Which is NOT a Kolmogorov axiom?",
          options: ["P(A) >= 0", "P(S) = 1", "P(A ∪ B) = P(A) + P(B) for disjoint A, B", "P(A) <= 1"],
          correctIndex: 3,
          explanation: "P(A) <= 1 is a derived property, not one of the three Kolmogorov axioms.",
        },
      ],
    },
  });

  await prisma.quizAttempt.create({
    data: {
      quizId: iamQuiz.id,
      studentId: student.id,
      answers: [{ questionId: "q1", selectedIndex: 2 }, { questionId: "q2", selectedIndex: 0 }, { questionId: "q3", selectedIndex: 1 }],
      score: 66.7,
      timeSpentSeconds: 420,
      completedAt: new Date("2026-03-10T14:30:00Z"),
    },
  });

  await prisma.quizAttempt.create({
    data: {
      quizId: ma201Quiz.id,
      studentId: student.id,
      answers: [{ questionId: "q1", selectedIndex: 1 }, { questionId: "q2", selectedIndex: 1 }],
      score: 100,
      timeSpentSeconds: 300,
      completedAt: new Date("2026-03-05T10:15:00Z"),
    },
  });

  await prisma.quizAttempt.create({
    data: {
      quizId: ma301Quiz.id,
      studentId: student.id,
      answers: [{ questionId: "q1", selectedIndex: 2 }, { questionId: "q2", selectedIndex: 2 }],
      score: 50,
      timeSpentSeconds: 180,
      completedAt: new Date("2026-03-15T09:00:00Z"),
    },
  });

  console.log("Created 3 quiz attempts");

  const iamCourseId = allCourseIds.find((c) => c.code === "CS401")!.id;
  const activityEntries: { type: string; entityType: string; entityId: string; metadata: Record<string, unknown> }[] = [
    { type: "COURSE_ENROLL", entityType: "course", entityId: iamCourseId, metadata: { action: "enrolled" } },
    { type: "COURSE_ENROLL", entityType: "course", entityId: countingCourseId, metadata: { action: "enrolled" } },
    { type: "COURSE_ENROLL", entityType: "course", entityId: probabilityCourseId, metadata: { action: "enrolled" } },
    { type: "TOPIC_VIEW", entityType: "topic", entityId: getTopicId("CS401:IAM Fundamentals"), metadata: { duration: 1200 } },
    { type: "TOPIC_VIEW", entityType: "topic", entityId: getTopicId("CS401:Password Authentication"), metadata: { duration: 900 } },
    { type: "QUIZ_COMPLETE", entityType: "quiz", entityId: iamQuiz.id, metadata: { score: 66.7 } },
    { type: "QUIZ_COMPLETE", entityType: "quiz", entityId: ma201Quiz.id, metadata: { score: 100 } },
    { type: "CONTENT_VIEW", entityType: "topic", entityId: getTopicId("MA201:Finite Set Cardinality"), metadata: { format: "summary" } },
    { type: "MASTERY_UPDATE", entityType: "topic", entityId: getTopicId("CS401:Multi-Factor Authentication"), metadata: { from: "SEEN", to: "PRACTICED" } },
    { type: "TOPIC_VIEW", entityType: "topic", entityId: getTopicId("MA301:Random Experiments"), metadata: { duration: 600 } },
  ];

  for (const entry of activityEntries) {
    await prisma.activityLog.create({
      data: {
        userId: student.id,
        type: entry.type,
        entityType: entry.entityType,
        entityId: entry.entityId,
        metadata: entry.metadata,
        createdAt: new Date(Date.now() - Math.random() * 14 * 86400000),
      },
    });
  }

  console.log(`Created ${activityEntries.length} activity log entries`);
  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
